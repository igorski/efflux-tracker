module.exports = {
    dev: {
        options: {
            browserifyOptions: {
                debug: true
            }
        },
        files: {
            '<%= config.target.dev %><%= pkg.name %>.js' : [ '<%= config.project.root %>**/*.js' ]
        }
    },
    prod: {
        options: {
            browserifyOptions: {
                debug: false
            }
        },
        files: {
            '<%= config.target.env %><%= pkg.name %>.js' : [ '<%= config.project.root %>**/*.js' ]
        }
    }
};
