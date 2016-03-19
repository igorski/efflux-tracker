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
var Time         = require( "../utils/Time" );
var ObjectUtil   = require( "../utils/ObjectUtil" );
var TemplateUtil = require( "../utils/TemplateUtil" );
var NoteUtil     = require( "../utils/NoteUtil" );
var TIA          = require( "../definitions/TIA" );
var MD5          = require( "md5" );

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

        return TemplateUtil.render( "asm", data );
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

    var amountOfSteps, patternString, accents, step, code, idx, increment, attenuate, i, writeOffset;
    var patternWordString, patternId, patternExisted, existingPatternIndex, patternIndex;

    var cachedPatterns = {};
    var patternArrayH  = []; // all high volume patterns
    var patternArrayL  = []; // all low volume patterns

    patterns.forEach( function( pattern )
    {
        amountOfSteps = pattern.steps;
        increment     = 32 / amountOfSteps; // sequencer works in 32 steps, Slocum Tracker patterns can be 16 steps

        pattern.channels.forEach( function( channel, channelIndex )
        {
            attenuate         = pattern[ "channel" + ( channelIndex + 1 ) + "attenuation" ];
            patternWordString = "    word ";
            patternString     = "";
            idx               = 0;

            for ( i = 0, writeOffset = 0; idx < 32; ++i )
            {
                step = null;

                if ( i % increment === 0 ) {
                    step = channel[ writeOffset ];
                    ++writeOffset;
                }

                code = null;

                if ( step )
                {
                    if ( NoteUtil.isPercussive( step.sound ))
                        code = TIA.getPercussionCode( step.sound );
                    else
                        code = TIA.getCode( tuning, step.sound, step.note, step.octave );
                }

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

                    patternString      = "";
                    patternWordString += patternId;
                    patternWordString += ( idx > 31 ) ? "" : ", ";
                }
            }

            // attenuated patterns go into the lower volume "patternArrayL" (starting at index 128)
            // otherwise patterns go into the higher volume "patternArrayH" (starting at index 0)
            // here we also make sure the word pattern we just created didn't exist before
            // if it did, we'll re-use the existing declaration to save bytes!

            if ( attenuate )
            {
                existingPatternIndex = getPreviousPatternDeclaration( patternArrayL, patternWordString );
                patternExisted       = ( existingPatternIndex > -1 );

                if ( !patternExisted ) {
                    patternIndex = 128 + patternArrayL.length;
                    patternArrayL.push( patternWordString + " ; " + patternIndex + "\n" );
                }
                else
                    patternIndex = existingPatternIndex;
            }
            else
            {
                existingPatternIndex = getPreviousPatternDeclaration( patternArrayH, patternWordString );
                patternExisted       = ( existingPatternIndex > -1 );

                if ( !patternExisted ) {
                    patternIndex = patternArrayH.length;
                    patternArrayH.push( patternWordString + " ; " + patternIndex + "\n" );
                }
                else
                    patternIndex = existingPatternIndex;
            }

            // write into the channel sequences

            if ( channelIndex === 0 )
                out.channel1sequence += "    byte " + patternIndex + "\n";
            else
                out.channel2sequence += "    byte " + patternIndex + "\n";
        });
    });

    // convert the pattern Arrays into strings

    out.patternArrayH = patternArrayH.join( "" );
    out.patternArrayL = patternArrayL.join( "" );

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

function getPreviousPatternDeclaration( patternArray, patternString )
{
    var i = patternArray.length;
    while ( i-- )
    {
        if ( patternArray[ i ].indexOf( patternString ) > -1 )
            return i;
    }
    return -1;
}
