/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the 'Software'), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import Config from "@/config";
import EventFactory from "./event-factory";
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxChannel } from "@/model/types/channel";
import type { EffluxPattern } from "@/model/types/pattern";
import EventUtil from "@/utils/event-util";
import { clone } from "@/utils/object-util";
import {
    PATTERNS, PATTERN_STEPS, PATTERN_CHANNELS,
    NOTE_POOLS, AUTOMATION_POOLS,
    EVENT_ACTION, // EVENT_ID,
    EVENT_INSTRUMENT, EVENT_NOTE, EVENT_OCTAVE, EVENT_LENGTH,
    EVENT_MODULE_AUTOMATION, EVENT_MODULE, EVENT_MODULE_VALUE, EVENT_MODULE_GLIDE
} from "../serializers/pattern-serializer";
import { ACTION_IDLE } from "../types/audio-event";

const PatternFactory =
{
    /**
     * @param {number=} amountOfSteps optional, the amount of
     *        subdivisions desired within the pattern, defaults to 16
     * @param {Array<Array<EffluxAudioEvent>>=} optChannels optional channels to
     *        assign to the pattern, otherwise empty channels are generated accordingly
     * @return {EffluxPattern}
     */
    create( amountOfSteps: number = 16, optChannels: EffluxChannel[] = null ): EffluxPattern {
        return {
            steps    : amountOfSteps,
            channels : optChannels || generateEmptyChannelPatterns( amountOfSteps )
        };
    },

    /**
     * deserializes the pattern lists from a .XTK file
     */
    deserialize( xtk: any, savedXtkVersion: number, tempo: number ): EffluxPattern[] {
        const patterns: EffluxPattern[] = new Array( xtk[ PATTERNS ].length );
        let pattern: EffluxPattern;
        let channel: EffluxChannel;
        let event: EffluxAudioEvent;

        let /* eventIdAcc = 0, */notePoolId: string, automationPoolId: string, eventData: any;
        let notePool: any[] = [], automationPool: any[] = [];
        if ( savedXtkVersion >= 4 ) {
            notePool = xtk[ NOTE_POOLS ].map( JSON.parse );
            automationPool = xtk[ AUTOMATION_POOLS ].map( JSON.parse );
        }

        xtk[ PATTERNS ].forEach(( xtkPattern: any, pIndex: number ): void => {

            pattern = patterns[ pIndex ] = PatternFactory.create(
                xtkPattern[ PATTERN_STEPS ],
                xtkPattern[ PATTERN_CHANNELS ]
            );

            xtkPattern[ PATTERN_CHANNELS ].forEach(( xtkChannel: any, cIndex: number ): void => {

                channel = pattern.channels[ cIndex ] = new Array( xtkChannel.length );

                xtkChannel.forEach(( xtkEvent: any, eIndex: number ) => {

                    if ( xtkEvent ) {

                        // ASSEMBLER_VERSION 4 introduced note and automation pooling
                        // to reduce file size, xtkEvent is a stringified reference to pool indices

                        if ( savedXtkVersion >= 4 && typeof xtkEvent === "string" ) {

                            [ notePoolId, automationPoolId ] = xtkEvent.split('|');

                            let mp = undefined;
                            if ( automationPoolId ) {
                                mp = { ...( automationPool[ parseFloat( automationPoolId ) ]) }
                            }
                            eventData = {
                                ...( notePool[ parseFloat( notePoolId ) ] || {} ),
                        //        [ EVENT_ID ]: ( ++eventIdAcc ),
                                [ EVENT_MODULE_AUTOMATION ]: mp,
                            };
                        }
                        else {
                            // legacy songs serialized events as unique Objects
                            eventData = xtkEvent;
                        }

                        event = {
                            action:     eventData[ EVENT_ACTION ],
                          //  id :        eventData[ EVENT_ID ], // responsibility of AudioService.noteOn()
                            instrument: eventData[ EVENT_INSTRUMENT ],
                            note:       eventData[ EVENT_NOTE ],
                            octave:     eventData[ EVENT_OCTAVE ],
                            recording:  false,
                            // @ts-expect-error omitting values that will be generated at runtime
                            seq: {
                                playing: false,
                                mpLength: 0
                            },
                        };

                        EventUtil.setPosition( event, pattern, pIndex, eIndex, tempo, eventData[ EVENT_LENGTH ]);
                        const xtkAutomation = eventData[ EVENT_MODULE_AUTOMATION ];

                        if ( xtkAutomation) {
                            event.mp = {
                                module: xtkAutomation[ EVENT_MODULE ],
                                value:  xtkAutomation[ EVENT_MODULE_VALUE ],
                                glide:  xtkAutomation[ EVENT_MODULE_GLIDE ]
                            };
                        }
                    }
                    else {
                        // @ts-expect-error we are cheating a bit using JS falsy values
                        event = 0;
                    }
                    channel[ eIndex ] = event;
                });
            });
        });
        return patterns;
    },

    /**
     * merge the contents of given sourcePattern with the
     * contents of given targetPattern. when content overlaps (e.g.
     * occupies the same step slot) it will be replaced by the ones
     * defined in given sourcePattern
     *
     * @param {EffluxPattern} targetPattern
     * @param {EffluxPattern} sourcePattern
     * @param {number} targetPatternIndex
     * @return {EffluxPattern} new pattern with merged contents
     */
    mergePatterns( targetPattern: EffluxPattern, sourcePattern: EffluxPattern, targetPatternIndex: number ): EffluxPattern {
        let targetLength = targetPattern.steps;
        let sourceLength = sourcePattern.steps;

        // equalize the pattern lengths

        let replacement: EffluxChannel[];
        let increment: number;

        if ( sourceLength > targetLength ) {
            // source is bigger than target pattern, increase target pattern size
            // while keeping existing content at relative positions

            replacement = generateEmptyChannelPatterns( sourceLength );
            increment   = Math.round( sourceLength / targetLength );

            replacement.forEach(( channel: EffluxChannel, index: number ): void => {
                for ( let i = 0, j = 0; i < targetLength; ++i, j += increment ) {
                    channel[ j ] = targetPattern.channels[ index ][ i ];
                }
            });

            targetPattern.channels = replacement;
            targetLength = targetPattern.steps = sourceLength;
        }
        else if ( targetLength > sourceLength ) {
            // target is bigger than source pattern, increase source pattern size
            // while keeping existing content at relative positions

            replacement = generateEmptyChannelPatterns( targetLength );
            increment   = Math.round( targetLength / sourceLength );

            replacement.forEach(( channel, index ) => {
                for ( let i = 0, j = 0; i < sourceLength; ++i, j += increment ) {
                    channel[ j ] = sourcePattern.channels[ index ][ i ];
                }
            });

            sourcePattern.channels = replacement;
            sourceLength = sourcePattern.steps = targetLength;
        }
        const merged = clone( targetPattern );

        merged.channels.forEach(( targetChannel: EffluxAudioEvent[], index: number ): void => {
            const sourceChannel = sourcePattern.channels[ index ];
            let i = targetLength;

            while ( i-- ) {
                const sourceEvent = sourceChannel[ i ];

                // copy source content into the target channel (only when it has a note action or module parameter automation)

                if ( sourceEvent && ( sourceEvent.action !== ACTION_IDLE || sourceEvent.mp )) {

                    const targetEvent = targetChannel[ i ] = clone( sourceEvent );

                    // update the start measure of the event

                    const eventStart  = targetEvent.seq.startMeasure;
                    const eventEnd    = targetEvent.seq.endMeasure;
                    const eventLength = isNaN( eventEnd ) ? 1 : eventEnd - eventStart;

                    targetEvent.seq.startMeasure = targetPatternIndex;
                    targetEvent.seq.endMeasure   = targetEvent.seq.startMeasure + eventLength;
                }
            }
        });
        return merged;
    }
};
export default PatternFactory;

/* internal methods */

/**
 * @param {number} amountOfSteps the amount of steps to generate in each pattern
 * @param {boolean=} addEmptyPatternStep optional, whether to add empty steps inside the pattern
 * @returns {Array<EffluxChannel>}
 */
function generateEmptyChannelPatterns( amountOfSteps: number, addEmptyPatternStep: boolean = false ): EffluxChannel[] {
    let out = [], i;

    for ( i = 0; i < Config.INSTRUMENT_AMOUNT; ++i ) {
        out.push( new Array( amountOfSteps ));
    }
    out.forEach(( channel: EffluxChannel ): void => {
        i = amountOfSteps;
        while ( i-- ) {
            if ( addEmptyPatternStep === true ) {
                channel[ i ] = EventFactory.create();
            } else {
                // @ts-expect-error we are cheating a bit using JS falsy values
                channel[ i ] = 0; // stringifies nicely in JSON save (otherwise is recorded as "null")
            }
        }
    });
    return out;
}
