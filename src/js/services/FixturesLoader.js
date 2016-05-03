/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var Config   = require( "../config/Config" );
var Messages = require( "../definitions/Messages" );
var Pubsub   = require( "pubsub-js" );
var Qajax    = require( "qajax" );

module.exports =
{
    /**
     * convenience method to retrieve demo songs via
     * Ajax, this overcomes the need to package them along
     * with the main application script
     *
     * @param {!Function} callback will receive parsed JSON Object
     */
    load : function( callback )
    {
        Pubsub.publish( Messages.SHOW_LOADER );

        Qajax( Config.getBasePath() + "/Fixtures.js" )
            .then( function( success )
            {
                Pubsub.publish( Messages.HIDE_LOADER );

                if ( success ) {
                    var data = success.responseText;
                    try {
                        var json = JSON.parse( data );
                        callback( json );
                    }
                    catch( e ) {}
                }
            },
            function( error )
            {
                Pubsub.publish( Messages.HIDE_LOADER );
            }
        );
    }
};
