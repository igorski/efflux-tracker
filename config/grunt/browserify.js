module.exports = {
    dev: {
        options: {
            browserifyOptions: {
                debug: true,
                transform: "workerify"
            }
        },
        files: {
            '<%= config.target.dev %><%= pkg.name %>.js' : [ '<%= config.project.root %>**/*.js' ]
        }
    },
    prod: {
        options: {
            browserifyOptions: {
                debug: false,
                transform: "workerify"
            }
        },
        files: {
            '<%= config.target.env %><%= pkg.name %>.js' : [ '<%= config.project.root %>**/*.js' ]
        }
    }
};
