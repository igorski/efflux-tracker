"use strict";

const css = require( "atomify-css" );

module.exports =
{
    concat( outputFile, outputAssets, callback )
    {
        const opts = {
            entry    : 'src/assets/css/layout.less',
            output   : outputFile,
            compress : true/*,
            assets: {
                dest   : outputAssets,
                prefix : 'resources/'
            }*/
        };

        css( opts, ( err ) => {

            if ( err )
                throw new Error( "could not resolve .less files", err );

            callback();
        });
    }
};
