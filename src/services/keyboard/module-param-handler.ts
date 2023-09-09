/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017-2021 - https://www.igorski.nl
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
import Vue from "vue";
import type { Store } from "vuex";
import Actions from "@/definitions/actions";
import EventFactory from "@/model/factories/event-factory";
import createAction from "@/model/factories/action-factory";
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxState } from "@/store";

// modules parameters available to Efflux, we map keyCode to the first letter(s) of their name

import {
    D_MODULES, E_MODULES, F_MODULES, O_MODULES, P_MODULES, V_MODULES, X_MODULES
} from "@/definitions/automatable-parameters";
import type { ModuleParamDef, ModuleDef } from "@/definitions/automatable-parameters";

let store: Store<EffluxState>;
let state: EffluxState;

let selectedGlide = false;
let selectedParam: ModuleParamDef;
let lastCharacter = "";
let lastTypeAction = 0;

const ModuleParamHandler =
{
    init( storeReference: Store<EffluxState> ): void {
        store = storeReference;
        state = store.state;
    },
    handleParam( keyCode: number ): void {
        let event = getEventForPosition( false );
        const createEvent = !event;

        if ( !createEvent && event.mp ) {
            selectedGlide = event.mp.glide;
        }

        if ( keyCode === 71 ) {  // G
            if ( event && event.mp ) {
                selectedGlide = event.mp.glide;
            }
            selectedGlide = !selectedGlide;
        } else {
            selectedParam = ModuleParamHandler.selectModuleByKeyAction( keyCode );
            if ( !selectedParam ) {
                return;
            }
        }
        // create event if it didn't exist yet
        if ( createEvent ) {
            event = getEventForPosition( true );
        }
        const mp = EventFactory.createModuleParam(
            ( !selectedParam && event && event.mp ) ? event.mp.module : selectedParam,
            ( event && event.mp ) ? event.mp.value : 50,
            selectedGlide
        );

        if ( createEvent ) {
            Vue.set( event, "mp", mp );
        } else {
            // a previously existed event will register the mp change in state history
            // (a newly created event is added to state history through its addition to the song)
            store.commit( "saveState", createAction(
                Actions.ADD_MODULE_AUTOMATION, { event, mp }
            ));
        }
    },
    selectModuleByKeyAction( keyCode: number, currentParam: ModuleParamDef = selectedParam ): ModuleParamDef {
        const now = Date.now();
        const previousTypeAction = lastTypeAction;

        lastTypeAction = now;

        // if this character was typed shortly after the previous one,
        // combine their values for more precise control
        const character = String.fromCharCode(( 96 <= keyCode && keyCode <= 105 ) ? keyCode - 48 : keyCode );

        if ( !character || !character.match( /^[a-z0-9]+$/i )) {
            return null;
        }
        const value = ( now - previousTypeAction < 500 ) ? lastCharacter + character : character;
        lastCharacter = character;

        // if user is typing multiple characters in succession, attempt to retrieve module by characters
        if ( value.length === 2 ) {
            return getModuleParamByFirstTwoLetters( value, currentParam );
        }
        else {
            switch ( keyCode ) {
                default:
                    return null;

                case 68: // D
                case 69: // E
                case 70: // F
                case 79: // O
                case 80: // P
                case 86: // V
                case 88: // X
                    return ModuleParamHandler.getNextSelectedModule( keyCode, currentParam );
            }
        }
    },
    getNextSelectedModule( keyCode: number, currentValue: ModuleParamDef ): ModuleParamDef {
        const list = getModuleListByKeyCode( keyCode );

        for ( let i = 0, l = list.length, max = l - 1; i <l; ++i ) {
            if ( list[ i ] !== currentValue ) {
                continue;
            }

            // value found, return next value in list (or first if we're at the list end)

            if ( i < max ) {
                return list[ i + 1 ];
            } else {
                break;
            }
        }
        return list[ 0 ]; // value not found, return first value in list
    }
};
export default ModuleParamHandler;

/* internal methods */

function getModuleListByKeyCode( keyCode: number ): ModuleDef {
    switch ( keyCode ) {
        default:
        case 68:
            return D_MODULES;
        case 69:
            return E_MODULES;
        case 70:
            return F_MODULES;
        case 79:
            return O_MODULES;
        case 80:
            return P_MODULES;
        case 86:
            return V_MODULES;
        case 88:
            return X_MODULES;
    }
}

function getModuleParamByFirstTwoLetters( letters: string, selectedParam: ModuleParamDef ): ModuleParamDef {
    let list;
    switch ( letters.charAt( 0 )) {
        case "D":
            list = D_MODULES;
            break;
        case "E":
            list = E_MODULES;
            break;
        case "F":
            list = F_MODULES;
            break;
        case "O":
            list = O_MODULES;
            break;
        case "P":
            list = P_MODULES;
            break;
        case "V":
            list = V_MODULES;
            break;
        case "X":
            list = X_MODULES;
            break;
    }

    if ( list ) {
        if ( list.length === 1 ) {
            return list[ 0 ];
        }
        for ( let i = 0; i < list.length; ++i ) {
            const param = list[ i ];
            let name = param.charAt( 0 ).toUpperCase();
            name += param.match( /([A-Z]?[^A-Z]*)/g )[ 1 ].charAt( 0 );
            if ( name.substr( 0, 2 ) === letters ) {
                return param;
            }
        }
    }
    // nothing found, return current
    return selectedParam;
}

function getEventForPosition( createIfNotExisting: boolean ): EffluxAudioEvent {
    let event = state.song.activeSong
                    .patterns[ store.getters.activePattern ]
                    .channels[ state.editor.selectedInstrument ][ state.editor.selectedStep ];

    if ( !event && createIfNotExisting === true ) {
        event = EventFactory.create( state.editor.selectedInstrument );
        store.commit( "addEventAtPosition", {
            event, store, optData: {
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
