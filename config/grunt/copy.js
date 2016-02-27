var fs      = require( "fs" );
var path    = require( "path" );
var grunt   = require( "grunt" );
var globals = require( "../globals" );

module.exports =
{
    app :
    {
        files : [
        {
            expand : true,
            cwd    : "<%= config.project.root %>",
            src    : [ "**/*.!html", "**/vendor/**/*" ],
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
