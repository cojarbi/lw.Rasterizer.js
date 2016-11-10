// LaserWeb namespace
var lw = lw || {};

// lw.Rasterizer scope
(function () {
    'use strict';

    // Rasterizer namespace
    lw.rasterizer = lw.rasterizer || {};

    // Return a tooltips as text/html
    lw.rasterizer.getTooltip = function(name, html) {
        var tooltip = lw.rasterizer.tooltips[name];

        if (! tooltip) {
            return 'Sorry, no tooltip for this setting.';
        }

        return html ? tooltip.join('<br />') : tooltip;
    };

    // Rasterizer tooltips
    lw.rasterizer.tooltips = {

        browse: [
            'Select a file from your computer to rasterize.',
            'Allowed <code>png</code> <code>jpeg</code> <code>gif</code> <code>bmp</code> <code>svg</code>'
        ],

        rasterize: [
            'Start the rasterization !'
        ],

        ppi: [
            'PPI = Pixel Per Inch (or DPI = Dot Per Inch)',
            'Your best bet for a better result is to take care of your beam size when you save your image, this is not mandatory but recommended.',
            'Ex.: If your beam size is "0.1mm", you want your image match "1px = 0.1mm" for a maximum resolution.',
            '<code>25.4 PPI = 1 PPM = Pixel Per Millimeter</code> <code>25.4 / 0.1mm = 254PPI.</code>',
            'For a beam diameter of "0.1mm" save your image at "254 PPI".',
            'For a beam diameter of "0.2mm" save your image at "127 PPI".'
        ],

        beamSize: [
            'The laser beam diameter in millimeters.'
        ],

        beamRange: [
            'The laser beam power range set in your firmware.',
            '- Smoothie <code>min: 0</code> <code>max: 1</code>',
            '- GRBL <code>min: 0</code> <code>max: 255</code>'
        ],

        beamPower: [
            'The laser beam power limits from 0 to 100% of the beam range set above.',
            'Ex.: if your beam range is set to <code>0 - 1</code> and the beam power is set to <code>20% - 80%</code>',
            'the <code>S</code> value in the outputed GCode never go out of the range of <code>0.2 - 0.8</code>.',
            'That means the color palet is mapped to this range <code>white = 0.2</code> - <code>black = 0.8</code>.'
        ],

        feedRate: [
            'The constant speed for the entier job set in millimeters per minutes or seconds.'
        ],

        offsets: [
            'Global X and Y axis offsets in millimeters.'
        ],

        overscan: [
            'This feature add some extra white spaces before and after each line.',
            'This leaves time to reach the feed rate before starting to engrave',
            'and can prevent over buring the edges of the raster.'
        ],

        grayscale: [
            'Because the human eye does not perceive all the colors in the same way,',
            'here are some classic algorithms that attempts to correct this offset.'
        ],

        shadesOfGray: [
            'Reduce the color pallete to X shades of gray.',
            'This can save some GCode bytes on dirty pictures.'
        ],

        smoothing: [
            'Apply a smoothing filter on the input image.'
        ],

        contrast: [
            'Image contrast adjustment from -255 to +255.'
        ],

        brightness: [
            'Image brightness adjustment from -255 to +255.'
        ],

        gamma: [
            'Image gamma adjustment from 0.01 to 2.'
        ],

        trimLine: [
            'Remove all trailing white pixels from the both ends of each line.',
            'This can significantly reduce the time to engrave and the GCode file size.'
        ],

        joinPixel: [
            'Draw a single line if several consecutive pixels of the same intensity are detected.',
            'This can significantly reduce the number of instructions and the GCode file size.'
        ],

        burnWhite: [
            'Avoids turning off the laser power but prevents burning by forcing the <code>S</code> value to zero <code>G1 S0</code>.'
        ],

        verboseG: [
            'In verbose mode, all GCode instructions will be included,',
            'otherwise only necessary instructions will be included.'
        ],

        diagonal: [
            'Scan the image diagonally rather than horizontally.',
            'This increase the distance between each points.'
        ]
    };

})();
