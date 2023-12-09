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
import Vue from "vue";
import { type EffluxAudioEvent, ACTION_IDLE, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import type { EffluxChannel, EffluxChannelEntry } from "@/model/types/channel";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxSong } from "@/model/types/song";

const NOTE_EVENTS = [ ACTION_NOTE_ON, ACTION_NOTE_OFF ];

type EventCompareFn = ( evt: EffluxAudioEvent ) => boolean;

const EventUtil =
{
    /**
     * update the position properties of given AudioEvent
     *
     * @param {EffluxAudioEvent} event
     * @param {EffluxPattern} pattern
     * @param {number} patternStep index of the audioEvent within the pattern
     * @param {number} tempo in BPM of the song
     */
    setPosition( event: EffluxAudioEvent, pattern: EffluxPattern, patternStep: number, tempo: number ): void {
        const measureLength = calculateMeasureLength( tempo );
        const eventOffset   = ( patternStep / pattern.steps ) * measureLength;
      
        Vue.set( event.seq, "startMeasureOffset", eventOffset );
    },
    /**
     * clears the AudioEvent at requested step position in
     * the given channel for the given pattern
     */
    clearEvent( song: EffluxSong, patternIndex: number, channelIndex: number, step: number ): void {
        const pattern = song.patterns[ patternIndex ];
        const channel = pattern.channels[ channelIndex ];

        Vue.set( channel, step, 0 );
    },
    /**
     * Brute force way to remove an event from a song
     */
    clearEventByReference( song: EffluxSong, event: EffluxAudioEvent ): void {
        let found = false;
        song.order.forEach(( patternIndex: number /* , orderIndex: number */ ): void => {
            song.patterns[ patternIndex ].channels.forEach(( channel: EffluxChannel, channelIndex: number ): void => {
                if ( found ) {
                    return;
                }
                channel.forEach(( compareEvent: EffluxAudioEvent, eventIndex: number ): void => {
                    if ( compareEvent === event ) {
                        EventUtil.clearEvent( song, patternIndex, channelIndex, eventIndex );
                        found = true;
                    }
                });
            });
        });
    },
    /**
     * retrieve the first AudioEvent before given step in given channel event list
     *
     * @param {Array<EffluxAudioEvent>} channelEvents
     * @param {number} step
     * @param {Function=} optCompareFn optional function to use
     *                    to filter events by
     * @return {EffluxAudioEvent|null}
     */
    getFirstEventBeforeStep( channelEvents: EffluxChannel, step: number, optCompareFn?: EventCompareFn ): EffluxAudioEvent | null {
        let previousEvent;
        for ( let i = step - 1; i >= 0; --i ) {
            previousEvent = channelEvents[ i ];
            if ( previousEvent &&
                ( typeof optCompareFn !== "function" || optCompareFn( previousEvent ))) {
                return previousEvent;
            }
        }
        return null;
    },
};
export default EventUtil;

export function areEventsEqual( event: EffluxAudioEvent, compareEvent: EffluxAudioEvent ): boolean {
    if ( event.instrument !== compareEvent.instrument ||
         event.note       !== compareEvent.note       ||
         event.octave     !== compareEvent.octave     ||
         event.action     !== compareEvent.action
    ) {
       return false;
    }

    if ( !!event.mp ) {
        if ( !compareEvent.mp ) {
            return false;
        }
        if ( event.mp.module !== compareEvent.mp.module ||
             event.mp.glide  !== compareEvent.mp.glide  ||
             event.mp.value  !== compareEvent.mp.value
        ) {
            return false;
        }
    }
    return true;
}

export function getEventLength( event: EffluxAudioEvent, channelIndex: number, orderIndex: number, song: EffluxSong ): number {
    const measureLength = calculateMeasureLength( song.meta.tempo );
    const defaultValue  = ( 1 / song.patterns[ song.order[ orderIndex ]].steps ) * measureLength;
    
    if ( event.action === ACTION_IDLE && !!event.mp ) {
        return defaultValue; // automation-only events last for a single pattern step
    }

    const patternStep = song.patterns[ song.order[ orderIndex ]].channels[ channelIndex ].indexOf( event );

    for ( let compareOrderIndex = orderIndex, l = song.order.length; compareOrderIndex < l; ++compareOrderIndex ) {
        const channel = song.patterns[ song.order[ compareOrderIndex ]].channels[ channelIndex ];

        for ( let compareStep = 0, jl = channel.length; compareStep < jl; ++compareStep ) {
            const compareEvent: EffluxChannelEntry = channel[ compareStep ];

            if ( !compareEvent ) {
                continue;
            }

            if ( !NOTE_EVENTS.includes( compareEvent.action )) {
                continue;
            }

            if ( compareOrderIndex === orderIndex ) {
                if ( compareStep <= patternStep ) {
                    continue;
                }
                return compareEvent.seq.startMeasureOffset - event.seq.startMeasureOffset;
            }
            else {
                const delta = ( compareOrderIndex - orderIndex ) * measureLength;
                return ( delta - event.seq.startMeasureOffset ) + compareEvent.seq.startMeasureOffset;
            }
        }
    }
    const remainingMeasures = song.order.length - orderIndex;
    return ( measureLength - event.seq.startMeasureOffset ) * remainingMeasures;
}

export function calculateJamChannelEventLengths( channel: EffluxChannel, tempo: number ): void {
    const { length } = channel;
    const measureLength = calculateMeasureLength( tempo );
    const stepToSecondsMultiplier = 1 / length * measureLength;

    // for jam channels we can afford a single reverse loop to calculate the length of all events in the channel
    let i = length;
    let last = length;
  
    while ( i-- ) {
        const event = channel[ i ];
        if ( !event ) {
            continue;
        }
        event.seq.length = ( event.action === ACTION_NOTE_ON ) ? ( last - i ) * stepToSecondsMultiplier : stepToSecondsMultiplier;
        if ( event.action !== ACTION_IDLE ) {
            last = i;
        }
    }
}

type IEventComparer = ( event: EffluxAudioEvent, compareEvent: EffluxAudioEvent ) => boolean;
type WrappedEvent = {
    event: EffluxAudioEvent,
    orderIndex: number,
};

export function getPrevEvent( song: EffluxSong, event: EffluxAudioEvent, channelIndex: number, orderIndex: number, ignoreFn?: IEventComparer ): WrappedEvent | undefined {
    const patternStep = song.patterns[ song.order[ orderIndex ]].channels[ channelIndex ].indexOf( event );

    for ( let compareOrderIndex = orderIndex; compareOrderIndex >= 0; --compareOrderIndex ) {
        const channel = song.patterns[ song.order[ compareOrderIndex ]].channels[ channelIndex ];

        for ( let compareStep = channel.length; compareStep >= 0; --compareStep ) {
            const compareEvent: EffluxChannelEntry = channel[ compareStep ];

            if ( !compareEvent ) {
                continue;
            }

            if ( compareOrderIndex === orderIndex && compareStep >= patternStep ) {
                continue;
            }

            if ( ignoreFn && ignoreFn( event, compareEvent )) {
                continue;
            }
            return { event: compareEvent, orderIndex: compareOrderIndex };
        }
    }
}

export function getNextEvent( song: EffluxSong, event: EffluxAudioEvent, channelIndex: number, orderIndex: number, ignoreFn?: IEventComparer ): WrappedEvent | undefined {
    const patternStep = song.patterns[ song.order[ orderIndex ]].channels[ channelIndex ].indexOf( event );

    for ( let compareOrderIndex = orderIndex, l = song.order.length; compareOrderIndex < l; ++compareOrderIndex ) {
        const channel = song.patterns[ song.order[ compareOrderIndex ]].channels[ channelIndex ];

        for ( let compareStep = 0, jl = channel.length; compareStep < jl; ++compareStep ) {
            const compareEvent: EffluxChannelEntry = channel[ compareStep ];

            if ( !compareEvent ) {
                continue;
            }

            if ( compareOrderIndex === orderIndex && compareStep <= patternStep ) {
                continue;
            }

            if ( ignoreFn && ignoreFn( event, compareEvent )) {
                continue;
            }
            return { event: compareEvent, orderIndex: compareOrderIndex };
        }
    }
}

// TODO: the 4 is implying all songs will be in 4/4 time
export function calculateMeasureLength( tempo: number, beatAmount = 4 ): number {
    return ( 60 / tempo ) * beatAmount;
}
