/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017-2022 - https://www.igorski.nl
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
import Actions from "@/definitions/actions";
import EventFactory from "@/model/factories/event-factory";
import createAction from "@/model/factories/action-factory";
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxState } from "@/store";
import EventUtil from "@/utils/event-util";
import { fromHex, isHex } from "@/utils/number-util";

let store: Store<EffluxState>;
let state: EffluxState;
let lastCharacter = "";
let lastTypeAction = 0;

export default {
    init( storeReference: Store<EffluxState> ): void {
        store = storeReference;
        ({ state } = store );
    },
    handleParam( keyCode: number ): void {
        const now = Date.now();
        const previousTypeAction = lastTypeAction;

        lastTypeAction = now;

        const character = String.fromCharCode(( 96 <= keyCode && keyCode <= 105 )? keyCode - 48 : keyCode );

        if ( !character || !character.match( /^[a-z0-9]+$/i )) {
            return;
        }
        // if this character was typed shortly after the previous one,
        // combine their values for more precise control

        let value: string | number = ( now - previousTypeAction < 500 ) ? lastCharacter + character : "0" + character;
        lastCharacter = character;

        let toggleGlide = false;

        if ( keyCode === 71 ) {
             // G key toggle glide value
             toggleGlide = true;
        } else {
            // validate value
            switch ( store.getters.paramFormat ) {
                default:
                case "hex":
                    if ( !isHex( value as string )) {
                        return;
                    }
                    value = fromHex( value );
                    break;

                case "pct":
                    const numericalValue = parseFloat( value );
                    if ( isNaN( numericalValue ) || numericalValue < 0 || numericalValue > 100 ) {
                        return;
                    }
                    break;
            }
        }

        let event = getEventForPosition( false );
        const createEvent = !event;

        // create event if it didn"t exist yet
        if ( createEvent ) {
            event = getEventForPosition( true );
        }

        // no module param defined yet ? create as duplicate of previously defined property
        let { mp  } = event;
        if ( !mp ) {
            const prevEvent = getPreviousEventWithModuleAutomation( state.editor.selectedStep );
            // @ts-expect-error value as number
            mp = EventFactory.createModuleParam(( prevEvent && prevEvent.mp ) ? prevEvent.mp.module : "volume", value, false );
        } else if ( toggleGlide ) {
            mp.glide = !mp.glide;
        }

        if ( isNaN( value as number )) {
            return;
        }

        if ( createEvent ) {
            Vue.set( event, "mp", mp );
        } else {
            // a previously existed event will register the mp change in state history
            // (a newly created event is added to state history through its addition to the song)
            store.commit( "saveState", createAction(
                Actions.ADD_MODULE_AUTOMATION, { event, mp: { ...mp, value  } }
            ));
        }
    }
};

/* internal methods */

function getPreviousEventWithModuleAutomation( step: number ): EffluxAudioEvent {
    let prevEvent;
    while ( !prevEvent || !prevEvent.mp ) {
        if ( step <= 0 ) {
            return null;
        }
        prevEvent = EventUtil.getFirstEventBeforeStep(
            state.song.activeSong
                .patterns[ store.getters.activePattern ]
                .channels[ state.editor.selectedInstrument ], step
        );
        step = ( prevEvent ) ? step - 1 : 0;
    }
    return prevEvent;
}

// TODO: duplicated from ModuleParamHandler...

function getEventForPosition( createIfNotExisting: boolean ): EffluxAudioEvent {
    let event = state.song.activeSong
                    .patterns[ store.getters.activePattern ]
                    .channels[ state.editor.selectedInstrument ][ state.editor.selectedStep ];

    if ( !event && createIfNotExisting === true ) {
        event = EventFactory.create( state.editor.selectedInstrument );
        store.commit( "addEventAtPosition", {
            store, event,
            optData: {
                patternIndex      : store.getters.activePattern,
                channelIndex      : state.editor.selectedInstrument,
                step              : state.editor.selectedStep,
                newEvent          : true,
                advanceOnAddition : false
            }
        });
    }
    return event;
}
