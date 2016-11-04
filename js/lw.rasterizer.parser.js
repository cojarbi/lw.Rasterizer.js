// LaserWeb namespace
var lw = lw || {};

// lw.Rasterizer scope
(function () {
    'use strict';

    // -------------------------------------------------------------------------

    // Rasterizer parser class
    lw.RasterizerParser = function() {
        this.canvasGrid   = null;
        this.currentLine  = null;
        this.lastCommands = null;
        this.beamOffset   = null;
        this.G0           = null;
    };

    // -------------------------------------------------------------------------

    // Init the parser
    lw.RasterizerParser.prototype.init = function(settings) {
        // Reset parser settings and state
        this.canvasGrid   = [];
        this.lastCommands = {};
        this.currentLine  = null;

        for (var prop in settings) {
            this[prop] = settings[prop];
        }

        // G0 command
        this.G0 = ['G', this.burnWhite ? 1 : 0];

        // Calculate beam offset
        this.beamOffset = this.beamSize * 1000 / 2000;

        // Calculate real beam range
        this.beamRange.min = this.beamRange.max / 100 * this.beamPower.min;
        this.beamRange.max = this.beamRange.max / 100 * this.beamPower.max;
    };

    // -------------------------------------------------------------------------

    // Add a new cell to the canvas grid
    lw.RasterizerParser.prototype.addCell = function(data) {
        // Canvas grid line not defined
        if (! this.canvasGrid[data.y]) {
            this.canvasGrid[data.y] = [];
        }

        // Add canvas buffer in the cell
        this.canvasGrid[data.y][data.x] = data.buffer;
    };

    // -------------------------------------------------------------------------

    // Post header GCode
    lw.RasterizerParser.prototype.postHeader = function() {
        // Output raster size in millimeters
        var width  = this.imageSize.width * this.beamSize;
        var height = this.imageSize.height * this.beamSize;

        // Base headers
        var headers = [
            '; Generated by lw.Rasterizer.js - ' + this.version,
            '; Size       : ' + width + ' x ' + height + ' mm',
            '; Resolution : ' + this.ppm + ' PPM - ' + this.ppi + ' PPI',
            '; Beam size  : ' + this.beamSize + ' mm',
            '; Beam range : ' + this.beamRange.min + ' to ' + this.beamRange.max,
            '; Beam power : ' + this.beamPower.min + ' to ' + this.beamPower.max + ' %',
            '; Feed rate  : ' + this.feedRate + ' mm/min'
        ];

        // Print activated options
        var options = ['smoothing', 'trimLine', 'joinPixel', 'burnWhite', 'verboseG', 'diagonal'];

        for (var i = options.length - 1; i >= 0; i--) {
            if (! this[options[i]]) {
                options.splice(i, 1);
            }
        }

        if (options.length) {
            headers.push('; Options    : ' + options.join(', '));
        }

        // Set feed rates
        headers.push(
            '',
            'G0 F' + this.feedRate,
            'G1 F' + this.feedRate,
            ''
        );

        // Post message to main script
        postMessage({ type: 'gcode', data: {
            text   : headers.join('\n'),
            type   : 'header',
            percent: 0
        }});
    };

    // -------------------------------------------------------------------------

    // Post done parsing message
    lw.RasterizerParser.prototype.postDone = function() {
        postMessage({ type: 'done' });
    };

    // -------------------------------------------------------------------------

    // Compute and return a command, return null if not changed
    lw.RasterizerParser.prototype.command = function(name, value) {
        // If the value argument is an object
        if (typeof value === 'object') {
            // Computed commands line
            var commands = Array.prototype.slice.call(arguments);
            var command, line = [];

            // for each command
            for (var i = 0, il = commands.length; i < il; i++) {
                command = this.command.apply(this, commands[i]);
                command && line.push(command);
            }

            // Return the line if not empty
            return line.length ? line.join(' ') : null;
        }

        // Format the value
        value = value.toFixed(this.precision[name] || 0);

        // If the value was changed or if verbose mode on
        if (this.verboseG || value !== this.lastCommands[name]) {
            this.lastCommands[name] = value;
            return name + value;
        }

        // No change
        return null;
    }

    // -------------------------------------------------------------------------

    // Get a pixel power value from the canvas data grid
    lw.RasterizerParser.prototype.mapPixelPower = function(value) {
        return value * (this.beamRange.max - this.beamRange.min)
                     / 255 + this.beamRange.min;
    };

    // -------------------------------------------------------------------------

    // Get a pixel power value from the canvas data grid
    lw.RasterizerParser.prototype.getPixelPower = function(x, y, defaultValue) {
        if (x < 0 || x >= this.imageSize.width) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }

            throw new Error('Out of range: x = ' + x);
        }

        if (y < 0 || y >= this.imageSize.height) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }

            throw new Error('Out of range: y = ' + y);
        }

        // reverse Y value since canvas as top/left origin
        y = this.imageSize.height - y - 1;

        // Target canvas data
        var gx   = parseInt(x / this.bufferSize);
        var gy   = parseInt(y / this.bufferSize);
        var data = this.canvasGrid[gy][gx];

        // Adjuste x/y values
        gx && (x -= this.bufferSize * gx);
        gy && (y -= this.bufferSize * gy);

        // Pixel index
        var i = (y * (this.imageSize.width * 4)) + (x * 4);

        // Gray value [0 = white - 255 = black]
        var gray = 255 - ((data[i] + data[i + 1] + data[i + 2]) / 3);

        // Return pixel power
        return gray;
    };

    // -------------------------------------------------------------------------

    // Get a point from the current line with real world coordinates
    lw.RasterizerParser.prototype.getPoint = function(index) {
        // Get the point object from the current line
        var point = this.currentLine[index];

        // No more point
        if (! point) {
            return null;
        }

        // Commands
        point.G = point.s ? ['G', 1] : this.G0;
        point.X = (point.x * this.beamSize);
        point.Y = (point.y * this.beamSize);
        point.S = this.mapPixelPower(point.s);

        // Vertical offset
        point.Y += this.beamOffset;

        // Horizontal offset
        if (point.lastWhite || point.first) {
            point.X += this.beamOffset;
        }
        else if (point.lastColored || point.last) {
            point.X -= this.beamOffset;
        }

        // Return the point
        return point;
    };

    // -------------------------------------------------------------------------

    // Process current line and return an array of GCode text lines
    lw.RasterizerParser.prototype.processCurrentLine = function() {
        // Point index
        var point, index = 0;

        // Init loop vars...
        var command, gcode = [];

        // Get first point
        point = this.getPoint(index);

        // Move to start of the line
        command = this.command(this.G0, ['X', point.X], ['Y', point.Y], ['S', 0]);
        command && gcode.push(command);

        // For each point on the line
        while (point) {
            // Burn to next point
            command = this.command(point.G, ['X', point.X], ['Y', point.Y], ['S', point.S]);
            command && gcode.push(command);

            // Get next point
            point = this.getPoint(++index);
        }

        // Return gcode commands array
        if (gcode.length) {
            return gcode;
        }

        // Empty line
        return null;
    };

    // -------------------------------------------------------------------------

    // Remove all trailing white spaces from the current line
    lw.RasterizerParser.prototype.trimCurrentLine = function() {
        // Loop vars...
        var i, il, j, start, end, done;

        // For each point on the line (from the two ends)
        for (i = 0, il = this.currentLine.length, j = il - 1; i < il ; i++, j--) {
            // left --> right
            if (start === undefined && this.currentLine[i].p) {
                start = i;
            }

            // left <-- right
            if (end === undefined && this.currentLine[j].p) {
                end = j + 1;
            }

            // Start/End index found
            if (start !== undefined && end !== undefined) {
                done = true;
                break;
            }
        }

        // If done
        if (done) {
            // Slice the current line
            this.currentLine = this.currentLine.slice(start, end);

            // Return new line length
            return this.currentLine.length;
        }

        // All white
        return null;
    };

    // -------------------------------------------------------------------------

    // Join pixel with same power
    lw.RasterizerParser.prototype.reduceCurrentLine = function() {
        // Store the current line
        var line = this.currentLine;

        // Reset the current line
        this.currentLine = [];

        // Extract first point
        var p2, p1 = line.shift();

        // For each point on the line (exept last one)
        while (line.length - 1) {
            // Extract the point
            p2 = line.shift();

            // Same color as last one
            if (p2.p === p1.p) {
                continue;
            }

            // Push the points
            this.currentLine.push(p1);
            this.currentLine.push(p2);

            // Store last point
            p1 = p2;
        }

        // Push the last point in any case
        this.currentLine.push(line.shift());
    }

    // -------------------------------------------------------------------------

    // Parse horizontally
    lw.RasterizerParser.prototype.parseHorizontally = function() {
        // Init loop vars
        var x, y, s, p, point, gcode;
        var w = this.imageSize.width;
        var h = this.imageSize.height;

        var reversed    = false;
        var lastWhite   = false;
        var lastColored = false;

        // For each image line
        for (y = 0; y < h; y++) {
            // Reset current line
            this.currentLine = [];

            // Reset point object
            point = null;

            // For each pixel on the line
            for (x = 0; x < w; x++) {
                // Get pixel power
                s = p = this.getPixelPower(x, y);

                // Last white/colored pixel
                lastWhite   = point && (!point.s && s);
                lastColored = point && (point.s && !s);

                // Pixel color from last one on reversed line
                if (! reversed && point) {
                    s = point.p;
                }

                // Create point object
                point = {
                    x: x, y: y, s: s, p: p,
                    lastColored: lastColored, lastWhite: lastWhite
                };

                // Add point to current line
                this.currentLine.push(point);
            }

            // Trim trailing white spaces ?
            if (this.trimLine) {
                this.trimCurrentLine();
            }

            // Join pixel with same power
            if (this.joinPixel) {
                this.reduceCurrentLine();
            }

            // Get last point object
            point = this.currentLine[this.currentLine.length - 1];

            // Create and add trailing point from last point
            this.currentLine.push({ x: point.x + 1, y: point.y, s: point.s, last: true });

            // Mark first point
            this.currentLine[0].first = true;

            // Reversed line ?
            if (reversed) {
                this.currentLine = this.currentLine.reverse();
            }

            // Process pixels line
            gcode = this.processCurrentLine();

            // Skip empty gcode line
            if (! gcode) {
                continue;
            }

            // Toggle line state
            reversed = ! reversed;

            // Post the gcode pixels line (only if not empty)
            postMessage({ type: 'gcode', data: {
                percent: Math.round((y / h) * 100),
                text   : gcode.join('\n')
            }});
        }
    };

    // -------------------------------------------------------------------------

    // Parse diagonally
    lw.RasterizerParser.prototype.parseDiagonally = function() {

    };

    // -------------------------------------------------------------------------

    // Parse the canvas grid
    lw.RasterizerParser.prototype.parse = function() {
        // Post GCode headers
        this.postHeader();

        // Parse type ?
        if (this.diagonal) {
            this.parseDiagonally();
        }
        else {
            this.parseHorizontally();
        }

        // Post parse done
        this.postDone();
    };

})();

// =============================================================================

// Crete RasterizerParser instance
var parser = new lw.RasterizerParser();

// WebWorker: on message received
self.onmessage = function(event) {
    // Event data as message
    var message = event.data;

    // Bind to pasrer methods
    parser[message.type].call(parser, message.data);
};
