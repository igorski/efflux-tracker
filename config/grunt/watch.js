module.exports = {
    js: {
        files: "<%= config.project.js %>**/*.js",
        tasks: [ "browserify:dev" ]
    },
    workers: {
        files: "<%= config.project.workers %>**/*.js",
        tasks: [ "copy:workers" ]
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
