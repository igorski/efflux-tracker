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
        data.hats.pattern = convertHatPattern( data.hats.pattern, data.hats.steps );

        return templates.asm( data );
    }
};

/* private methods */

function convertPatterns( patterns, tuning )
{
    var out = {
        channel1sequence : "",
        channel2sequence : "",
        patterns         : "",
        patternArrayH    : "",
        patternArrayL    : ""
    };

    var amountOfSteps, patternString, accents, step, code, idx, increment, patternId, patternArray, i, writeOffset;
    var amountOfPatterns = 0;

    var cachedPatterns = {};

    patterns.forEach( function( pattern )
    {
        amountOfSteps = pattern.steps;
        increment     = 32 / amountOfSteps; // sequencer works in 32 steps, Slocum Tracker patterns can be 16 steps

        pattern.channels.forEach( function( channel, channelIndex )
        {
            patternArray  = "    word ";
            patternString = "";
            idx           = 0;

            for ( i = 0, writeOffset = 0; idx < 32; ++i )
            {
                step = null;

                if ( i % increment === 0 ) {
                    step = channel[ writeOffset ];
                    ++writeOffset;
                }
                code = ( step ) ? TIA.getCode( tuning, step.sound, step.note, step.octave ) : null;

                // at beginning of each quarter measure, prepare accents list

                if ( idx % 8 === 0 )
                    accents = "\n    byte %";

                // every two 32nd notes, prefix output with byte declaration

                if ( idx % 2 === 0 )
                    patternString += "    byte ";

                patternString += ( code ) ? code : "255";
                patternString += ( idx % 2 === 0 ) ? ", " : "\n";
                accents       += ( code && step.accent ) ? 1 : 0;

                ++idx;

                if ( idx % 8 === 0 || idx > 31 )
                {
                    patternString += accents + "\n\n";
                    patternId = MD5( patternString.trim() ); // create unique ID for pattern content

                    if ( !cachedPatterns.hasOwnProperty( patternId ))
                        cachedPatterns[ patternId ] = patternId + "\n" + patternString;

                    patternString = "";
                    patternArray += patternId;
                    patternArray += ( idx > 31 ) ? "" : ", ";
                }
            }
            // TODO: also use L array !
            out.patternArrayH += ( patternArray + " ; " + amountOfPatterns + "\n" ); // TODO  when using L add 128 to the patternnum

            if ( channelIndex === 0 ) {
                out.channel1sequence += "    byte " + amountOfPatterns + "\n";
            }
            else {
                out.channel2sequence += "    byte " + amountOfPatterns + "\n";
            }
            ++amountOfPatterns; // TODO: when using L array this starts at 128 !
        });
    });

    // collect all assembled patterns

    var value, replacement;

    Object.keys( cachedPatterns ).forEach( function( key, index )
    {
        // replace hashed value with a shorthand (otherwise code won't compile!)

        replacement = "Pattern" + ( index + 1 );
        value = cachedPatterns[ key ].replace( key, replacement );
        out.patterns += value;

        // replace usages of hashed value with new short hand

        out.patternArrayH = out.patternArrayH.split( key ).join( replacement );
        out.patternArrayL = out.patternArrayL.split( key ).join( replacement );
    });

    return out;
}

function convertHatPattern( pattern, steps )
{
    var asmPattern = "";
    var increment  = pattern.length / steps;

    for ( var i = 0, l = pattern.length; i < l; i += increment )
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
