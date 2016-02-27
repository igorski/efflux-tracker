module.exports =
{
    options: {
        mangle: true,
        compress : { sequences: true,
             properties: true,
             dead_code: true,
             drop_debugger: true,
             unsafe: false,
             unsafe_comps: false,
             conditionals: true,
             comparisons: true,
             evaluate: true,
             booleans: true,
             loops: true,
             unused: true,
             hoist_funs: true,
             keep_fargs: false,
             hoist_vars: false,
             if_return: true,
             join_vars: true,
             cascade: true,
             side_effects: false,
             pure_getters: false,
             pure_funcs: null,
             negate_iife: true,
             screw_ie8: true,
             drop_console: true,
             angular: false,
             warnings: false
        },
        sourceMap: false,
        sourceMapName: '<%= config.target.env %>maps/app.map'
    },
    prod: {
        files: {
            '<%= config.target.env %><%= pkg.name %>.js': [ '<%= config.target.prod %><%= pkg.name %>.js' ]
        }
    }
};