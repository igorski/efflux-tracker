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
import type { Store } from "vuex";
import EventFactory from "@/model/factories/event-factory";
import type { EffluxAudioEvent, EffluxAudioEventModuleParams } from "@/model/types/audio-event";
import type { EffluxChannel, EffluxChannelEntry } from "@/model/types/channel";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxSong } from "@/model/types/song";
import type { EffluxState } from "@/store";
import EventUtil, { getNextEvent } from "@/utils/event-util";
import { clone } from "@/utils/object-util";
import { invalidateCache } from "./event-actions";

/**
 * glide the values between the event (or event before) the given step to the next event after
 * the given step (this creates a smooth gradual glide lasting for the amount of steps in
 * between the start- and endpoints described above)
 */
export default function glideParameterAutomations( song: EffluxSong, step: number, orderIndex: number, channelIndex: number, store: Store<EffluxState> ): void {
    const patternIndex  = song.order[ orderIndex ];
    const channelEvents = song.patterns[ patternIndex ].channels[ channelIndex ];
    const existingEvent = channelEvents[ step ];

    const event = ( existingEvent && existingEvent.mp ) ? existingEvent : EventUtil.getFirstEventBeforeStep(
        channelEvents, step, compareEvent => !!compareEvent.mp
    );
    if ( !event ) {
        return showError( store );
    }

    const orgContent = clone( channelEvents );
    const eventIndex = channelEvents.indexOf( event );

    let createdEvents: EffluxAudioEvent[];
    function act(): void {
        createdEvents = glideModuleParams( song, orderIndex, channelIndex, eventIndex );
    }
    act();

    if ( createdEvents?.length > 0 ) {
        store.commit( "saveState", {
            undo: () => {
                // clone() is necessary to avoid conflicts when stepping the history state back and forth
                Vue.set( song.patterns[ patternIndex ].channels, channelIndex, clone( orgContent ));
                invalidateCache( store, song, channelIndex );
            },
            redo: act
        });
    } else {
        showError( store );
    }
};

/* internal methods */

function showError( store: Store<EffluxState> ): void {
    store.commit( "showError", store.getters.t( "errors.paramGlide" ))
}

/**
 * create a smooth glide for the module parameter changes from
 * one slot to another
 *
 * @param {EffluxSong} song
 * @param {number} orderIndex
 * @param {number} channelIndex
 * @param {number} eventIndex
 * @return {EffluxAudioEvent[]} created audio events
 */
export function glideModuleParams( song: EffluxSong, orderIndex: number, channelIndex: number, eventIndex: number ): EffluxAudioEvent[] {
    const firstPatternEvents = song.patterns[ song.order[ orderIndex ]].channels[ channelIndex ];
    const firstEvent         = firstPatternEvents[ eventIndex ] as EffluxAudioEvent;
    const firstParam         = firstEvent.mp;

    let secondEvent: EffluxAudioEvent;
    let secondParam: EffluxAudioEventModuleParams;
    let compareEvent = getNextEvent( song, firstEvent, channelIndex, orderIndex );

    while ( compareEvent ) {

        secondEvent = compareEvent.event;
        secondParam = secondEvent.mp;

        // ignore events without a module parameter change

        if ( secondParam ) {

            // if new event has a module parameter change for the
            // same module, we have found our second event

            if ( secondParam.module === firstParam.module ) {
                break;
            } else {
                return [];
            }
        }
        // keep iterating through the list
        compareEvent = getNextEvent( song, compareEvent.event, channelIndex, compareEvent.orderIndex );
    }

    if ( !secondParam ) {
        return [];
    }

    // ensure events glide their module parameter change

    Vue.set( firstParam,  "glide", true );
    Vue.set( secondParam, "glide", true );

    const events = fillEventRange( song, firstEvent, secondEvent, orderIndex, channelIndex );
    const steps  = events.length + 1;
    let increment = 1;

    if ( secondParam.value > firstParam.value ) {
        // gliding value up
        increment = ( secondParam.value - firstParam.value ) / steps;
        events.forEach(( event: EffluxAudioEvent, index: number ): void => {
            const mp = event.mp;
            Vue.set( mp, "value", firstParam.value + (( index + 1 ) * increment ));
        });
    }
    else {
        // gliding value down
        increment = ( secondParam.value - firstParam.value ) / steps;
        events.forEach(( event: EffluxAudioEvent, index: number ): void => {
            const mp = event.mp;
            Vue.set( mp, "value", firstParam.value + (( index + 1 ) * increment ));
        });
    }
    return events;
}

/* internal methods */

/**
 * Fills the range between given first and second event with audio events
 * @returns the created audio event range
 */
function fillEventRange( song: EffluxSong, firstEvent: EffluxAudioEvent, secondEvent: EffluxAudioEvent, orderIndex: number, channelIndex: number ): EffluxAudioEvent[] {
    let startFound = false;
    const events: EffluxAudioEvent[] = [];

    const addOrUpdateEvent = ( evt: EffluxChannelEntry, pattern: EffluxPattern, channel: EffluxChannel, eventIndex: number ): EffluxAudioEvent => {
        if ( typeof evt !== "object" ) {
            // event didn't exist... create it and insert into the channel
            evt = EventFactory.create( firstEvent.instrument );
            Vue.set( channel, eventIndex, evt );
            EventUtil.setPosition( evt, pattern, eventIndex, song.meta.tempo );
        }
        Vue.set( evt, "mp", {
            module: firstEvent.mp.module,
            value: 0,
            glide: true
        });
        return evt;
    };
    
    for ( let i = orderIndex, l = song.order.length; i < l; ++i ) {
        const pattern = song.patterns[ song.order[ i ]];
        const channel = pattern.channels[ channelIndex ];

        for ( let j = 0; j < channel.length; ++j ) {
            let event = channel[ j ];

            if ( event === firstEvent ) {
                startFound = true;
            } else if ( event === secondEvent ) {
                return events;
            } else if ( startFound ) {
                event = addOrUpdateEvent( event, pattern, channel, j );
                events.push( event );
            }
        }
    }
    return events;
}
