/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxChannel } from "@/model/types/channel";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxSong } from "@/model/types/song";
import PatternValidator from "@/model/validators/pattern-validator";
import { clone } from "@/utils/object-util";
import { areEventsEqual } from "@/utils/event-util";

type SerializedPatternList = {
    patterns: EffluxPattern[]
};

export default {
    /**
     * insert a pattern at the given index for the given pattern list
     *
     * @param {Array<EffluxPattern>} patterns list of patterns
     * @param {number} index where the generated pattern will be added
     * @param {number} amountOfSteps the amount of steps in the pattern to generate
     * @param {EffluxPattern=} pattern optional pattern to inject, otherwise empty pattern is created
     * @return {Array<EffluxPattern>} updated list
     */
    addPatternAtIndex( patterns: EffluxPattern[], index: number, amountOfSteps: number, pattern?: EffluxPattern ): EffluxPattern[] {
        const front = patterns.slice( 0, index );
        const back  = patterns.slice( index );

        front.push( pattern ? pattern : PatternFactory.create( amountOfSteps ));

        return front.concat( back );
    },
    /**
     * removes the pattern at given index from given list of patterns
     *
     * @param {Array<EffluxPattern>} patterns list of patterns
     * @param {number} index where the generated pattern will be added
     * @return {Array<EffluxPattern>} updated list
     */
    removePatternAtIndex( patterns: EffluxPattern[], index: number ): EffluxPattern[] {
        patterns.splice( index, 1 );

        const front = patterns.slice( 0, index );
        const back  = patterns.slice( index );

        return front.concat( back );
    }
};

/**
 * Serializes a list of patterns ranges into an encoded PATTERN_FILE_EXTENSION file
 *
 * @param {Array<EffluxPattern>} patterns to serialize
 * @param {number} firstChannel first channel index to serialize pattern data from
 * @param {number} lastChannel last channel index to serialize pattern data from
 * @return {string} base64 encoded PATTERN_FILE_EXTENSION file content
 */
export const serializePatternFile = ( patterns: EffluxPattern[], firstChannel = 0, lastChannel = Config.INSTRUMENT_AMOUNT - 1 ): string => {
    // clone the pattern contents
    const cloned: EffluxPattern[] = [];
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

export const deserializePatternFile = ( encodedPatternData: string ): EffluxPattern[] | null => {
    try {
        const parsed = JSON.parse( window.atob( encodedPatternData )) as SerializedPatternList;
        // validate contents
        if ( !Array.isArray( parsed.patterns ) || !parsed.patterns.every( PatternValidator.isValid )) {
            return null;
        }
        return parsed.patterns;
    } catch {
        return null;
    }
};

export const arePatternsEqual = ( pattern: EffluxPattern, comparePattern: EffluxPattern ): boolean => {
    if ( pattern.steps !== comparePattern.steps ) {
        return false;
    }

    if ( pattern.channels.length !== comparePattern.channels.length ) {
        return false;
    }
    
    for ( let i = 0, l = pattern.channels.length; i < l; ++i ) {
        const channel: EffluxChannel = pattern.channels[ i ];
        const compareChannel: EffluxChannel = comparePattern.channels[ i ];

        if ( channel.length !== compareChannel.length ) {
            return false;
        }
        for ( let j = 0, jl = channel.length; j < jl; ++j ) {
            const event        = channel[ j ];
            const compareEvent = compareChannel[ j ];

            if ( !event || !compareEvent ) {
                if ( event === compareEvent ) {
                    continue; // both events are undefined
                }
                return false;
            }

            if ( !areEventsEqual( event, compareEvent )) {
                return false;
            }
        }
    }
    return true;
};

/**
 * convenience method to clone all event and channel data for given pattern
 * this also resets each events play state to ensure seamless playback when
 * performing und/redo actions during playback
 */
export const clonePattern = ( song: EffluxSong, activePatternIndex: number ): EffluxPattern => {
    const clonedPattern = clone( song.patterns[ activePatternIndex ]);
    clonedPattern.channels.forEach(( channel: EffluxChannel ) => {
        channel.forEach(( event: EffluxAudioEvent ) => {
            if ( event?.seq?.playing ) {
                event.seq.playing = false;
            }
        });
    });
    return clonedPattern;
};
