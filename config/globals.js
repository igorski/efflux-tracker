var fs   = require('fs');
var path = require('path');

var config = module.exports =
{
    config :
    {
        env: 'dev', // overridden by build task

        // where the app development takes place
        project: {
            root      : 'src/',
            js        : 'src/js',
            workers   : 'src/workers',
            assets    : 'src/assets/',
            templates : 'src/templates/',
            modules   : 'node_modules/'
        },

        // build output folders
        target: {
            dev   : 'dist/dev/',
            prod  : 'dist/prod/',
            env   : 'dist/dev'      // overridden by build task
        }
    }
};
var modulePath = path.join(__dirname, './grunt');

fs.readdirSync(modulePath).forEach(function(file){
    config[file.slice(0, -3)] = require(path.join(modulePath, file));
});
