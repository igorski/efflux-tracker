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
import Vue            from "vue";
import Actions  from "@/definitions/actions";
import EventFactory   from "@/model/factories/event-factory";
import createAction   from "@/model/factories/action-factory";
import EventUtil      from "@/utils/event-util";
import { fromHex, isHex } from "@/utils/number-util";

let store, state;
let lastCharacter = "", lastTypeAction = 0;

export default {
    init( storeReference ) {
        store = storeReference;
        ({ state } = store );
    },

    handleParam( keyCode ) {
        const now = Date.now();
        const previousTypeAction = lastTypeAction;

        lastTypeAction = now;

        const character = String.fromCharCode(( 96 <= keyCode && keyCode <= 105 )? keyCode - 48 : keyCode );

        if ( !character || !character.match( /^[a-z0-9]+$/i )) {
            return;
        }
        // if this character was typed shortly after the previous one,
        // combine their values for more precise control

        let value = ( now - previousTypeAction < 500 ) ? lastCharacter + character : "0" + character;
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
                    if ( !isHex( value ))
                        return;
                    else
                        value = fromHex( value );
                        break;

                case "pct":
                    value = parseFloat( value );
                    if ( isNaN( value ) || value < 0 || value > 100 )
                        return;
            }
        }

        let event = getEventForPosition();
        const createEvent = !event;

        // create event if it didn"t exist yet
        if ( createEvent )
            event = getEventForPosition( true );

        // no module param defined yet ? create as duplicate of previously defined property
        let { mp  } = event;
        if ( !mp ) {
            const prevEvent = getPreviousEventWithModuleAutomation(state.editor.selectedStep);
            mp = EventFactory.createModuleParam(
                ( prevEvent && prevEvent.mp ) ? prevEvent.mp.module : "volume", value, false
            );
        } else if ( toggleGlide ) {
            mp.glide = !mp.glide;
        }
        if ( isNaN( value )) {
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

function getPreviousEventWithModuleAutomation( step ) {
    let prevEvent;
    while ( !prevEvent || !prevEvent.mp ) {

        if ( step <= 0 )
            return null;

        prevEvent = EventUtil.getFirstEventBeforeStep(
            state.song.activeSong
                .patterns[ state.sequencer.activePattern ]
                .channels[ state.editor.selectedInstrument ], step
        );
        step = ( prevEvent ) ? step - 1 : 0;
    }
    return prevEvent;
}

// TODO: duplicated from ModuleParamHandler...

function getEventForPosition( createIfNotExisting ) {
    let event = state.song.activeSong
                    .patterns[ state.sequencer.activePattern ]
                    .channels[ state.editor.selectedInstrument ][ state.editor.selectedStep ];

    if ( !event && createIfNotExisting === true ) {

        event = EventFactory.createAudioEvent(state.editor.selectedInstrument);
        store.commit("addEventAtPosition", {
            store, event,
            optData: {
                patternIndex      : state.sequencer.activePattern,
                channelIndex      : state.editor.selectedInstrument,
                step              : state.editor.selectedStep,
                newEvent          : true,
                advanceOnAddition : false
            }
        });
    }
    return event;
}
