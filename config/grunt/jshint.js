"use strict";

module.exports = {
    options: {
        esversion: 6,
        strict: "global",
        browser: true,
        browserify: true,
        laxbreak: true,
        globals: {
            // globals
            efflux: true,
            DFT: true,
            // Worker-scope
            Handlebars: true,
            importScripts: true,
            postMessage: true,
            // missing WebAudio properties
            AudioContext: true,
            webkitAudioContext: true,
            GainNode: true,
            OscillatorNode: true,
            AudioBufferSourceNode: true,
            PeriodicWave: true
        }
    },
    files: {
        src: [
            'Gruntfile.js',
            'config/**/*.js',
            'src/js/**/*.js'
        ]
    }
};