"use strict";

const fs      = require( "fs" );
const path    = require( "path" );
const grunt   = require( "grunt" );
const globals = require( "../globals" );

module.exports =
{
    app :
    {
        files : [
        {
            expand : true,
            cwd    : "<%= config.project.root %>",
            src    : [ "**/*.!html" ],
            dest   : "<%= config.target.env %>"
        },
        {
            expand : true,
            cwd    : "<%= config.project.root %>/public_html",
            src    : [ "**/*" ],
            dest   : "<%= config.target.env %>"
        }
        ]
    },

    assets :
    {
        files : [

        // module ./assets folder
        // CSS is excluded as custom "css"-task resolves the dependencies

        {
            expand : true,
            cwd    : "<%= config.project.assets %>",
            src    : [ "**/*", "!**/css/**" ],
            dest   : "<%= config.target.env %>/assets"
        }]
    }
};
