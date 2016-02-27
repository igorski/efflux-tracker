module.exports = {
    js: {
        files: "<%= config.project.root %>**/*.js",
        tasks: [ "browserify:dev" ]
    },
    html: {
        files: "<%= config.project.root %>**/*.html",
        tasks: [ "copy:app", "replace:dev" ]
    },
    css: {
        files: "<%= config.project.assets %>**/*.less",
        tasks: [ "css:dev" ]
    },
    templates: {
        files: "<%= config.project.templates %>**/*",
        tasks: [ "handlebars" ]
    }
};
