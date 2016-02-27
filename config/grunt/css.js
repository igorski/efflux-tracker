var css = require( "atomify-css" );

module.exports =
{
    concat : function( outputFile, outputAssets, callback )
    {
        var opts = {
            entry    : 'src/assets/css/layout.less',
            output   : outputFile,
            compress : true/*,
            assets: {
                dest   : outputAssets,
                prefix : 'resources/'
            }*/
        };

        css( opts, function( err )
        {
            if ( err )
                throw new Error( "could not resolve .less files", err );

            callback();
        });
    }
};
