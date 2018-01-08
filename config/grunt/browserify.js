"use strict";

module.exports = {
    dev: {
        options: {
            browserifyOptions: {
                debug: true,
                transform: [
                    ["babelify", {
                        presets: ['es2015'],
                        ignore: /WaveTables/
                    }],
                    "workerify"
                ]
            }
        },
        files: {
            '<%= config.target.dev %><%= pkg.name %>.js': ['<%= config.project.root %>**/*.js']
        }
    },
    prod: {
        options: {
            browserifyOptions: {
                debug: false,
                transform: [
                    ["babelify", {presets: ['es2015']}],
                    "workerify"
                ]
            }
        },
        files: {
            '<%= config.target.env %><%= pkg.name %>.js': ['<%= config.project.root %>**/*.js']
        }
    }
};
