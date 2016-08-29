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
"use strict";

const Config   = require( "../config/Config" );
const Messages = require( "../definitions/Messages" );
const Pubsub   = require( "pubsub-js" );
const Qajax    = require( "qajax" );

module.exports =
{
    /**
     * convenience method to retrieve demo songs via
     * Ajax, this overcomes the need to package them along
     * with the main application script
     *
     * @param {!Function} callback will receive parsed JSON Object
     * @param {string} filename to load
     */
    load( callback, filename )
    {
        showLoader();
        Qajax( Config.getBasePath() + "/" + filename )
            .then(( success ) =>
            {
                hideLoader();

                if ( success ) {
                    const data = success.responseText;
                    try {
                        const json = JSON.parse( data );
                        callback( json );
                    }
                    catch( e ) {}
                }
            },
            ( error ) => hideLoader
        );
    }
};

function showLoader() {
    Pubsub.publish( Messages.SHOW_LOADER );
}

function hideLoader() {
    Pubsub.publish( Messages.HIDE_LOADER );
}