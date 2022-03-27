/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
import Config from "@/config";
import PatternFactory from "@/model/factories/pattern-factory";
import PatternValidator from "@/model/validators/pattern-validator";
import { clone } from "@/utils/object-util";

export default {
    /**
     * insert a pattern at the given index for the given pattern list
     *
     * @param {Array<PATTERN>} patterns list of patterns
     * @param {number} index where the generated pattern will be added
     * @param {number} amountOfSteps the amount of steps in the pattern to generate
     * @param {PATTERN=} pattern optional pattern to inject, otherwise empty pattern is created
     * @return {Array<PATTERN>} updated list
     */
    addPatternAtIndex( patterns, index, amountOfSteps, pattern ) {
        const front = patterns.slice( 0, index );
        const back  = patterns.slice( index );

        front.push( pattern ? pattern : PatternFactory.create( amountOfSteps ));

        // update event offset for back patterns (as their start/end offsets should now shift)

        back.forEach(pattern => {
            pattern.channels.forEach( channel => {
                channel.forEach( event => {
                    if ( event ) {
                        ++event.seq.startMeasure;
                        ++event.seq.endMeasure;
                    }
                });
            });
        });
        return front.concat( back );
    },
    /**
     * removes the pattern at given index from given list of patterns
     *
     * @param {Array<PATTERN>} patterns list of patterns
     * @param {number} index where the generated pattern will be added
     * @return {Array<PATTERN>} updated list
     */
    removePatternAtIndex( patterns, index ) {
        patterns.splice( index, 1 );

        const front = patterns.slice( 0, index );
        const back  = patterns.slice( index );

        // update event offset for back patterns (as their start/end offsets should now shift)

        back.forEach(pattern => {
            pattern.channels.forEach( channel => {
                channel.forEach( event => {
                    if ( event ) {
                        --event.seq.startMeasure;
                        --event.seq.endMeasure;
                    }
                });
            });
        });
        return front.concat( back );
    }
};

/**
 * Serializes a list of patterns ranges into an encoded PATTERN_FILE_EXTENSION file
 *
 * @param {Array<PATTERN>} patterns to serialize
 * @param {number} firstChannel first channel index to serialize pattern data from
 * @param {number} lastChannel last channel index to serialize pattern data from
 * @return {String} base64 encoded PATTERN_FILE_EXTENSION file content
 */
export const serializePatternFile = ( patterns, firstChannel = 0, lastChannel = Config.INSTRUMENT_AMOUNT - 1 ) => {
    // clone the pattern contents
    const cloned = [];
    patterns.forEach( p => {
        const clonedPattern = PatternFactory.create( p.steps );
        for ( let i = firstChannel; i <= lastChannel; ++i ) {
            clonedPattern.channels[ i ] = clone( p.channels[ i ]);
        }
        cloned.push( clonedPattern );
    });
    // serialize
    return window.btoa( JSON.stringify({ patterns: cloned }));
};

export const deserializePatternFile = encodedPatternData => {
    try {
        const parsed = JSON.parse( window.atob( encodedPatternData ));
        // validate contents
        if ( !Array.isArray( parsed.patterns ) || !parsed.patterns.every( PatternValidator.isValid )) {
            return null;
        }
        return parsed.patterns;
    } catch {
        return null;
    }
};
