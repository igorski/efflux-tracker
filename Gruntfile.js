"use strict";

const globals = require( "./config/globals" );

module.exports = function( grunt )
{
    grunt.initConfig(
    {
        "pkg":         grunt.file.readJSON( "package.json" ),
        "config":      globals.config,
        "browserSync": globals.browsersync,
        "browserify":  globals.browserify,
        "jshint":      globals.jshint,
        "clean":       globals.clean,
        "replace":     globals.replace,
        "copy":        globals.copy,
        "concat":      globals.concat,
        "watch":       globals.watch,
        "uglify":      globals.uglify,
        "css":         globals.css,
        "handlebars":  globals.handlebars,
        "json-minify":  globals.jsonminify
    });

    grunt.loadNpmTasks( "grunt-browser-sync" );
    grunt.loadNpmTasks( "grunt-browserify" );
    grunt.loadNpmTasks( "grunt-contrib-jshint" );
    grunt.loadNpmTasks( "grunt-contrib-clean" );
    grunt.loadNpmTasks( "grunt-text-replace" );
    grunt.loadNpmTasks( "grunt-contrib-concat" );
    grunt.loadNpmTasks( "grunt-contrib-copy" );
    grunt.loadNpmTasks( "grunt-contrib-watch" );
    grunt.loadNpmTasks( "grunt-contrib-uglify" );
    grunt.loadNpmTasks( "grunt-contrib-handlebars" );
    grunt.loadNpmTasks( "grunt-json-minify" );

    grunt.registerTask( "dev",  [ "build:dev", "browserSync", "watch" ]);
    grunt.registerTask( "prod", [ "build:prod" ]);

    grunt.registerTask( "build", function( env )
    {
        env          = env || "prod";
        const target = grunt.config.data.config.target;
        target.env   = ( env === "prod" ) ? target.prod : target.dev;

        switch ( env )
        {
            case "dev":
                grunt.task.run( "clean:dev" );
                grunt.task.run( "copy" );
                grunt.task.run( "concat" );
                grunt.task.run( "handlebars" );
                grunt.task.run( "css:dev" );
                grunt.task.run( "replace:dev" );
                grunt.task.run( "browserify:dev" );
                break;

            case "prod":
                grunt.task.run( "clean:prod" );
                //grunt.task.run( "jshint" );
                grunt.task.run( "copy" );
                grunt.task.run( "concat" );
                grunt.task.run( "handlebars" );
                grunt.task.run( "css:prod" );
                grunt.task.run( "replace:prod" );
                grunt.task.run( "browserify:prod" );
                grunt.task.run( "uglify:prod" );
                grunt.task.run( "json-minify:prod" );
                break;
        }
    });

    grunt.registerTask( "css", function( env )
    {
        env          = env || "prod";
        const target = grunt.config.data.config.target;
        target.env   = ( env === "prod" ) ? target.prod : target.dev;

        grunt.config.data.css.concat( target.env + "/assets/css/layout.min.css",
                                      target.env + "/assets/css/resources",
                                      this.async() );
    });
};
