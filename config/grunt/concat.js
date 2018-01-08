"use strict";

module.exports =
{
    // copy third party libraries

    vendor : {
        src : [ "<%= config.project.modules %>/dspjs/dsp.js" ],
        dest : "<%= config.target.env %>/vendor/vendor.js"
    },

    // copy handlebars runtime and templates

    handlebars : {
        src: [
            "<%= config.project.modules %>/handlebars/dist/handlebars.runtime.min.js",
            "<%= config.target.env %>/handlebars/templates.js"
        ],
        dest: "<%= config.target.env %>/handlebars/handlebars.js"
    },

    // copy fixtures

    fixturesSongs :
    {
        // add Array braces to encapsulate all files
        options: {
            banner: '[',
            footer: ']',
            separator: ','
        },
        src : [ "<%= config.project.root %>/fixtures/songs/**/*.json" ],
        dest : "<%= config.target.env %>/Songs.json"
    },

    fixturesInstruments :
    {
        // add Array braces to encapsulate all files
        options: {
            banner: '[',
            footer: ']',
            separator: ','
        },
        src : [ "<%= config.project.root %>/fixtures/instruments/**/*.json" ],
        dest : "<%= config.target.env %>/Instruments.json"
    }
};
