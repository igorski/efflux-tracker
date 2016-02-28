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
var Handlebars = require( "handlebars/dist/handlebars.runtime.min.js" );
var templates  = require( "../handlebars/templates" )( Handlebars );
var Time       = require( "../utils/Time" );

module.exports =
{
    /**
     * @public
     * @param {Object} song JSON song
     * @return {string} assembly code to for Slocums Sequencer Kit
     */
    assemblify : function( song )
    {
        // clone data as we must modify some properties prior to passing it to the Handlebars template...

        var data = JSON.parse( JSON.stringify( song ));

        data.meta.created = Time.timestampToDate( data.meta.created );
        data.hats.pattern = convertHatPattern( data.hats.pattern );

        return templates.asm( data );
    }
};

/* private methods */

function convertHatPattern( pattern )
{
    var asmPattern = "";

    for ( var i = 0, l = pattern.length; i < l; ++i )
    {
        if ( i % 8 === 0 ) {
            if ( i > 0 )
                asmPattern += "\n";

            asmPattern += "    byte %";
        }
        asmPattern += pattern[ i ];
    }
    return asmPattern;
}
