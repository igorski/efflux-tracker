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
var Config       = require( "../config/Config" ),
    EventFactory = require( "./EventFactory" );

/**
 * type definition for a pattern list
 *
 * @typedef {{
 *              steps: number,
 *              channels: Array.<Array.<AUDIO_EVENT>>
 *          }}
 */
var PATTERN;

var PatternFactory = module.exports =
{
    /**
     * @public
     * @param {number=} amountOfSteps optional, the amount of
     *        subdivisions desired within the pattern, defaults to 16
     *
     * @return {PATTERN}
     */
    createEmptyPattern : function( amountOfSteps )
    {
        amountOfSteps = ( typeof amountOfSteps === "number" ) ? amountOfSteps : 16;

        return {
            steps    : amountOfSteps,
            channels : generateEmptyChannelPatterns( amountOfSteps )
        };
    },

    /**
     * merge the contents of given sourcePattern into the
     * contents of given targetPattern. when content overlaps (e.g.
     * occupies the same step slot) it will be replaced by the ones
     * defined in given sourcePattern
     *
     * @public
     * @param {PATTERN} targetPattern
     * @param {PATTERN} sourcePattern
     * @param {number} targetPatternIndex
     */
    mergePatterns : function( targetPattern, sourcePattern, targetPatternIndex )
    {
        var targetLength = targetPattern.steps;
        var sourceLength = sourcePattern.steps;
        var sourceChannel, i, j;

        // equalize the pattern lengths

        var replacement, increment;

        if ( sourceLength > targetLength )
        {
            // source is bigger than target pattern, increase target pattern size
            // while keeping existing content at relative positions

            replacement = generateEmptyChannelPatterns( sourceLength );
            increment   = Math.round( sourceLength / targetLength );

            replacement.forEach( function( channel, index )
            {
                for ( i = 0, j = 0; i < targetLength; ++i, j += increment )
                    channel[ j ] = targetPattern.channels[ index ][ i ];
            });

            targetPattern.channels = replacement;
            targetLength = targetPattern.steps = sourceLength;
        }
        else if ( targetLength > sourceLength )
        {
            // target is bigger than source pattern, increase source pattern size
            // while keeping existing content at relative positions

            replacement = generateEmptyChannelPatterns( targetLength );
            increment   = Math.round( targetLength / sourceLength );

            replacement.forEach( function( channel, index )
            {
                for ( i = 0, j = 0; i < sourceLength; ++i, j += increment )
                    channel[ j ] = sourcePattern.channels[ index ][ i ];
            });

            sourcePattern.channels = replacement;
            sourceLength = sourcePattern.steps = targetLength;
        }

        var sourceStep, orgStartMeasure;

        targetPattern.channels.forEach( function( targetChannel, index )
        {
            sourceChannel = sourcePattern.channels[ index ];

            i = targetLength;

            while ( i-- ) {

                sourceStep = sourceChannel[ i ];

                // copy source content into the target channel (only when it has a note action or module parameter automation)

                if ( sourceStep && ( sourceStep.action !== 0 || sourceStep.mp )) {

                    targetChannel[ i ] = sourceStep;

                    // update the start measure of the event

                    orgStartMeasure             = sourceStep.seq.startMeasure;
                    sourceStep.seq.startMeasure = targetPatternIndex;
                    sourceStep.seq.endMeasure  += ( targetPatternIndex - orgStartMeasure );
                }
            }
        });
    },

    /**
     * clears the AudioEvent at requested step position in
     * the given channel for the given pattern
     *
     * @public
     * @param {PATTERN} pattern
     * @param {number} channelNum
     * @param {number} step
     */
    clearEvent : function( pattern, channelNum, step )
    {
        var channel = pattern.channels[ channelNum ];
        delete channel[ step ];
    }
};

/* private methods */

/**
 * @private
 * @param {number} amountOfSteps the amount of steps to generate in each pattern
 * @param {boolean=} addEmptyPatternStep optional, whether to add empty steps inside the pattern
 * @returns {Array.<Array.<AUDIO_EVENT>>}
 */
function generateEmptyChannelPatterns( amountOfSteps, addEmptyPatternStep )
{
    var out = [], i;

    for ( i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
        out.push( new Array( amountOfSteps ));

    if ( addEmptyPatternStep !== true )
        return out;

    out.forEach( function( channel )
    {
        i = amountOfSteps;

        while ( i-- )
            channel[ i ] = EventFactory.createAudioEvent();
    });
    return out;
}
