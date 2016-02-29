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
var ObjectUtil = require( "../utils/ObjectUtil" );
var TIA        = require( "../definitions/TIA" );
var MD5        = require( "md5" );

module.exports =
{
    /**
     * @public
     * @param {Object} song JSON song
     * @return {string} song as assembly code for Paul Slocums Sequencer Kit
     */
    assemblify : function( song )
    {
        // clone data as we must modify some properties prior to passing it to the Handlebars template...

        var data = ObjectUtil.clone( song );

        data.meta.created = Time.timestampToDate( data.meta.created );
        data.patterns     = convertPatterns( data.patterns, TIA.table.tunings[ song.meta.tuning ]);
        data.hats.pattern = convertHatPattern( data.hats.pattern );

        return templates.asm( data );
    }
};

/* private methods */

function convertPatterns( patterns, tuning )
{
    var out = {
        sequences: "",
        patterns : ""
    };

    var amountOfSteps, patternString, accents, step, code, idx, increment, patternId, i, writeOffset;
    var amountOfPatterns = 0;

    var cachedPatterns = {};

    patterns.forEach( function( pattern )
    {
        amountOfSteps = pattern.steps;
        increment     = 32 / amountOfSteps; // sequencer works in 32 steps, Slocum Tracker patterns can be 16 steps

        pattern.channels.forEach( function( channel )
        {
            patternString = "";
            idx           = 0;

            for ( i = 0, writeOffset = 0; writeOffset < amountOfSteps; ++i )
            {
                step = null;

                if ( i % increment === 0 ) {
                    step = channel[ writeOffset ];
                    ++writeOffset;
                }
                code = ( step ) ? TIA.getCode( tuning, step.sound, step.note, step.octave ) : null;

                if ( idx % 8 === 0 )
                    accents = "\n    byte %";

                if ( idx % 2 === 0 )
                    patternString += "    byte ";

                patternString += ( code ) ? code : "255";
                patternString += ( idx % 2 === 0 ) ? ", " : "\n";
                accents       += ( code && step.accent ) ? 1 : 0;

                if ( ++idx % 8 === 0 )
                {
                    patternString += accents + "\n\n";
                    patternId = MD5( patternString.trim() ); // create unique ID for pattern content

                    if ( !cachedPatterns.hasOwnProperty( patternId )) {
                        ++amountOfPatterns;
                        cachedPatterns[ patternId ] = "PATTERN" + amountOfPatterns + "\n" + patternString;
                    }
                    else {
                        console.log("existed for id at pattern " + ( amountOfPatterns ),patternId);
                    }
                    patternString = "";
                }
            }
        });
    });

    Object.keys( cachedPatterns ).forEach( function( key )
    {
        out.patterns += cachedPatterns[ key ];
    });

    console.log(out.patterns);
    return out;
}

function convertHatPattern( pattern )
{
    var asmPattern = "";

    for ( var i = 0, l = pattern.length; i < l; ++i )
    {
        if ( i % 8 === 0 )
        {
            if ( i > 0 )
                asmPattern += "\n";

            asmPattern += "    byte %";
        }
        asmPattern += pattern[ i ];
    }
    return asmPattern;
}
