/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
import Config       from '../../config';
import EventFactory from './EventFactory';
import ObjectUtil   from '../../utils/ObjectUtil';

const PatternFactory =
{
    /**
     * @public
     * @param {number=} amountOfSteps optional, the amount of
     *        subdivisions desired within the pattern, defaults to 16
     *
     * @return {PATTERN}
     */
    createEmptyPattern( amountOfSteps )
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
    mergePatterns( targetPattern, sourcePattern, targetPatternIndex )
    {
        let targetLength = targetPattern.steps;
        let sourceLength = sourcePattern.steps;
        let sourceChannel, i, j;

        // equalize the pattern lengths

        let replacement, increment;

        if ( sourceLength > targetLength )
        {
            // source is bigger than target pattern, increase target pattern size
            // while keeping existing content at relative positions

            replacement = generateEmptyChannelPatterns( sourceLength );
            increment   = Math.round( sourceLength / targetLength );

            replacement.forEach(( channel, index ) =>
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

            replacement.forEach(( channel, index ) =>
            {
                for ( i = 0, j = 0; i < sourceLength; ++i, j += increment )
                    channel[ j ] = sourcePattern.channels[ index ][ i ];
            });

            sourcePattern.channels = replacement;
            sourceLength = sourcePattern.steps = targetLength;
        }

        let sourceEvent, targetEvent;

        targetPattern.channels.forEach(( targetChannel, index ) =>
        {
            sourceChannel = sourcePattern.channels[ index ];

            i = targetLength;

            while ( i-- ) {

                sourceEvent = sourceChannel[ i ];

                // copy source content into the target channel (only when it has a note action or module parameter automation)

                if ( sourceEvent && ( sourceEvent.action !== 0 || sourceEvent.mp )) {

                    targetEvent = targetChannel[ i ] = ObjectUtil.clone( sourceEvent );

                    // update the start measure of the event

                    const eventStart  = targetEvent.seq.startMeasure;
                    const eventEnd    = targetEvent.seq.endMeasure;
                    const eventLength = isNaN( eventEnd ) ? 1 : eventEnd - eventStart;

                    targetEvent.seq.startMeasure = targetPatternIndex;
                    targetEvent.seq.endMeasure   = targetEvent.seq.startMeasure + eventLength;
                }
            }
        });
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
    let out = [], i;

    for ( i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
        out.push( new Array( amountOfSteps ));

    out.forEach(( channel ) =>
    {
        i = amountOfSteps;

        while ( i-- ) {

            if ( addEmptyPatternStep === true )
                channel[ i ] = EventFactory.createAudioEvent();
            else
                channel[ i ] = 0; // stringifies nicely in JSON save (otherwise is recorded as "null")
        }
    });
    return out;
}

export default PatternFactory;
