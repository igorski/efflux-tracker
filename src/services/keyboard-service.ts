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
import type { Store } from "vuex";
import Config from "@/config";
import Actions from "@/definitions/actions";
import ModalWindows from "@/definitions/modal-windows";
import EventFactory from "@/model/factories/event-factory";
import createAction from "@/model/factories/action-factory";
import EventUtil from "@/utils/event-util";
import { ACTION_NOTE_OFF } from "@/model/types/audio-event";
import type { EffluxState } from "@/store";
import { PROPERTIES } from "@/store/modules/settings-module";
import NoteInputHandler from "./keyboard/note-input-handler";
import InstrumentSelectionHandler from "./keyboard/instrument-selection-handler";
import ModuleParamHandler from "./keyboard/module-param-handler";
import ModuleValueHandler from "./keyboard/module-value-handler";

type ListenerRef = ( type: string, keyCode: number, event: KeyboardEvent ) => void;

let store: Store<EffluxState>;
let state: EffluxState;
let listener: ListenerRef;
let suspended = false, blockDefaults = true, optionDown = false, shiftDown = false;
let maxStep, targetStep, currentInstrument;

const DEFAULT_BLOCKED = [ 8, 9, 32, 37, 38, 39, 40 ];
const MAX_CHANNEL = Config.INSTRUMENT_AMOUNT - 1;
const MAX_SLOT = 3;
const noop = (): void => {};

// the different operating modes inside the PatternTrackList

enum MODES {
    NOTE_INPUT = 0,
    INSTRUMENT_SELECT,
    PARAM_SELECT,
    PARAM_VALUE
};
let mode = MODES.NOTE_INPUT;

/**
 * KeyboardService is a dedicated controller that listens to keyboard
 * input events, allowing combinations of keypresses to toggle application
 * editing modes across components and states.
 */
const KeyboardService =
{
    init( storeReference: Store<EffluxState> ): void {
        store = storeReference;
        state = store.state;

        // these handlers remain active for the entire application lifetime

        window.addEventListener( "keydown", handleKeyDown );
        window.addEventListener( "keyup",   handleKeyUp );
        window.addEventListener( "focus",   handleFocus );

        // initialize the handlers for the individual sections
        // the respective components will trigger their enabled/disabled states

        NoteInputHandler.init( storeReference );
        InstrumentSelectionHandler.init( storeReference );
        ModuleParamHandler.init( storeReference );
        ModuleValueHandler.init( storeReference );
    },
    /**
     * whether the Apple option or a control key is
     * currently held down for the given event
     */
    hasOption( event: KeyboardEvent ): boolean {
        return optionDown === true || event.ctrlKey;
    },
    /**
     * whether the shift key is currently held down
     */
    hasShift(): boolean {
        return shiftDown === true;
    },
    /**
     * attach a listener to receive updates whenever a key
     * has been released. listenerRef is a function
     * which receives three arguments:
     *
     * the listener is usually a Vue component
     */
    setListener( listenerRef: ListenerRef ): void {
        listener = listenerRef;
    },
    /**
     * the KeyboardService can be suspended so it
     * will not fire its callback to the listeners
     */
    setSuspended( value: boolean ): void {
        suspended = value;
    },
    /**
     * whether to block default behaviour on certain keys
     */
    setBlockDefaults( value: boolean ): void {
        blockDefaults = value;
    },
    reset(): void {
        KeyboardService.setListener( null );
        KeyboardService.setSuspended( false );
        KeyboardService.setBlockDefaults( true );
    },
    syncEditorSlot(): void {
        switch ( state.editor.selectedSlot ) {
            default:
                mode = MODES.NOTE_INPUT;
                break;
            case 1:
                mode = MODES.INSTRUMENT_SELECT;
                break;
            case 2:
                mode = MODES.PARAM_SELECT;
                break;
            case 3:
                mode = MODES.PARAM_VALUE;
                break;
        }
    }
};
export default KeyboardService;

/* internal methods */

function handleKeyDown( event: KeyboardEvent ): void {
    if ( suspended ) {
        return;
    }
    const { keyCode } = event;

    if ( typeof listener === "function" ) {
        listener( "down", keyCode, event );
        return;
    }

    // prevent defaults when using the arrows, space (prevents page jumps) and backspace (navigate back in history)

    if ( blockDefaults && DEFAULT_BLOCKED.includes( keyCode )) {
        preventDefault( event );
    }
    const hasOption = KeyboardService.hasOption( event );
    shiftDown = !!event.shiftKey;

    if ( !hasOption && !shiftDown ) {
        handleInputForMode( keyCode );
    }

    const { sequencer, editor } = state;
    const { activeSong } = state.song;

    switch ( keyCode )
    {
        case 27: // escape

            // close dialog (if existing), else close overlay (if existing)
            if ( state.dialog ) {
                store.commit( "closeDialog" );
            } else if ( state.modal ) {
                store.commit( "closeModal" );
            }
            break;

        case 32: // spacebar
            store.commit( "setPlaying", !sequencer.playing );
            break;

        // capture the apple key here as it is not recognized as a modifier

        case 224:   // Firefox
        case 17:    // Opera
        case 91:    // WebKit left key
        case 93:    // Webkit right key
            optionDown = true;
            break;

        case 33: // page up
            store.commit( "setSelectedStep", Math.max( 0, editor.selectedStep - 4 ));
            handleSelectionOnVerticalMovement( event );
            break;

        case 34: // page down
            maxStep = activeSong.patterns[ store.getters.activePatternIndex ].steps - 1;
            store.commit( "setSelectedStep", Math.min( maxStep, editor.selectedStep + 4 ));
            handleSelectionOnVerticalMovement( event );
            break;

        case 35: // end
            store.commit( "setSelectedStep", activeSong.patterns[ store.getters.activePatternIndex ].steps - 1 );
            handleSelectionOnVerticalMovement( event );
            break;

        case 36: // home
            store.commit( "setSelectedStep", 0 );
            handleSelectionOnVerticalMovement( event );
            break;

        case 38: // up
            store.commit( "setSelectedStep", editor.selectedStep - 1 );
            handleSelectionOnVerticalMovement( event );
            break;

        case 40: // down

            maxStep = activeSong.patterns[ store.getters.activePatternIndex ].steps - 1;
            targetStep = editor.selectedStep + 1;

            if ( targetStep <= maxStep ) {
                store.commit( "setSelectedStep", targetStep);
            }
            handleSelectionOnVerticalMovement( event );
            break;

        case 39: // right

            if ( store.getters.jamMode ) {
                maxStep = activeSong.patterns[ store.getters.activePatternIndex ].steps - 1;
                targetStep = editor.selectedStep + 1;
                store.commit( "setSelectedStep", targetStep <= maxStep ? targetStep : 0 );
                break;
            }

            if ( hasOption ) {
                store.commit( "gotoNextPattern", activeSong );
            }
            else {
                currentInstrument = editor.selectedInstrument; // cache the current instrument before updating slot positions
                if ( setSelectedSlot( editor.selectedSlot + 1 )) {
                    // when not in selection mode and we go right from the most right lane, move to the next pattern (when existing)
                    if ( !shiftDown && editor.selectedInstrument + 1 > MAX_CHANNEL ) {
                        if ( sequencer.activeOrderIndex < ( activeSong.order.length - 1 )) {
                            store.commit( "gotoPattern", { orderIndex: sequencer.activeOrderIndex + 1, song: activeSong });
                            store.commit( "setSelectedInstrument", 0 );
                        } else {
                            store.commit( "setSelectedSlot", MAX_SLOT );
                        }
                    } else {
                        store.commit( "setSelectedInstrument", editor.selectedInstrument + 1 );
                    }
                }
                if ( shiftDown ) {
                    store.commit( "handleHorizontalKeySelectAction", {
                        keyCode,
                        selectedChannel: currentInstrument,
                        selectedStep: editor.selectedStep
                    });
                } else {
                    store.commit( "clearSelection" );
                }
            }
            break;

        case 37: // left

            if ( store.getters.jamMode ) {
                targetStep = editor.selectedStep - 1;
                store.commit( "setSelectedStep", targetStep >= 0 ? targetStep : activeSong.patterns[ store.getters.activePatternIndex ].steps - 1 );
                break;
            }

            if ( hasOption ) {
                store.commit( "gotoPreviousPattern", activeSong );
            }
            else {
                if ( setSelectedSlot( editor.selectedSlot - 1 )) {
                    // when not in selection mode and we go left from the most left lane, move to the previous pattern (when existing)
                    if ( !shiftDown && editor.selectedInstrument - 1 < 0 ) {
                        if ( sequencer.activeOrderIndex > 0 ) {
                            store.commit( "gotoPattern", { orderIndex: sequencer.activeOrderIndex - 1, song: activeSong });
                            store.commit( "setSelectedInstrument", MAX_CHANNEL );
                            store.commit( "setSelectedSlot", MAX_SLOT );
                        } else {
                            store.commit( "setSelectedSlot", 0 );
                        }
                    } else {
                        store.commit( "setSelectedInstrument", editor.selectedInstrument - 1 );
                    }
                }
                if ( shiftDown ) {
                    store.commit( "handleHorizontalKeySelectAction", {
                        keyCode,
                        selectedChannel: editor.selectedInstrument,
                        selectedStep: editor.selectedStep
                    });
                }
                else {
                    store.commit( "clearSelection" );
                }
            }
            break;

        case 8:  // backspace
            handleDeleteActionForCurrentMode();
            handleKeyUp({ keyCode: 38, preventDefault: noop } as never as KeyboardEvent ); // move up to previous slot
            break;

        case 9: // tab
            const next = shiftDown ? editor.selectedInstrument - 1 : editor.selectedInstrument + 1;
            store.commit( "setSelectedInstrument", Math.max( 0, Math.min( MAX_CHANNEL, next )));
            break;

        case 13: // enter
            // confirm dialog (if existing)
            if ( state.dialog ) {
                store.commit( "closeDialog" );
            } else if ( hasOption ) {
                store.commit( "setShowNoteEntry", !editor.showNoteEntry );
            } else {
                store.commit( "openModal", ModalWindows.MODULE_PARAM_EDITOR );
            }
            break;

        case 46: // delete
            handleDeleteActionForCurrentMode();
            handleKeyUp({ keyCode: 40, preventDefault: noop } as never as KeyboardEvent ); // move down to next slot
            break;

        case 65: // A
            // select all
            if ( hasOption ) {
                store.commit( "setMinSelectedStep", 0 );
                store.commit( "setMaxSelectedStep", activeSong.patterns[ store.getters.activePatternIndex ].steps );
                store.commit( "setSelectionChannelRange", { firstChannel: 0, lastChannel: Config.INSTRUMENT_AMOUNT - 1 });
            }
            break;

        case 67: // C

             // copy current selection
             if ( hasOption ) {
                 if ( !store.getters.hasSelection ) {
                     store.commit( "setSelectionChannelRange", { firstChannel: editor.selectedInstrument });
                     store.commit( "setSelection", { selectionStart: editor.selectedStep });
                 }
                 store.commit( "copySelection", { song: activeSong, activePattern: store.getters.activePatternIndex });
                 store.commit( "clearSelection" );
             }
             break;

        case 68: // D
            // deselect all
            if ( hasOption ) {
                store.commit( "clearSelection" );
                preventDefault( event );  // "add to bookmark" :)
            }
            break;

        case 70: // F
            if ( hasOption ) {
                store.commit( "saveSetting", { name: PROPERTIES.FOLLOW_PLAYBACK, value: !store.getters.followPlayback });
                preventDefault( event ); // text search
            }
            break;

        case 71: // G
            if ( hasOption ) {
                EventUtil.glideParameterAutomations(
                    activeSong, editor.selectedStep, store.getters.activeOrderIndex,
                    editor.selectedInstrument, store
                );
                preventDefault( event ); // in-page search
            }
            break;

        case 75: // K
            store.commit( "addEventAtPosition", {
                event: EventFactory.create( 0, "", 0, ACTION_NOTE_OFF ), store
            });
            break;

        case 76: // L
            if ( hasOption ) {
                store.commit( "setLooping", !sequencer.looping );
                preventDefault( event ); // location bar
            }
            break;

        case 79: // O
            if ( hasOption ) {
                store.commit( "openModal", ModalWindows.SONG_BROWSER );
                preventDefault( event ); // file open dialog
            }
            break;

        case 82: // R
            if ( hasOption ) {
                store.commit( "setRecording", !sequencer.recording );
                preventDefault( event ); // page refresh
            }
            break;

        case 83: // S
            if ( hasOption ) {
                const { meta } = activeSong;
                if ( meta.title && meta.author ) {
                    store.dispatch( "saveSong", activeSong );
                } else {
                    store.commit( "openModal", ModalWindows.SONG_SAVE_WINDOW );
                }
                preventDefault( event ); // page save
            }
            break;

        case 86: // V

            // paste current selection
            if ( hasOption && store.getters.hasCopiedEvents ) {
                store.commit( "saveState", createAction( Actions.PASTE_SELECTION, { store }));
            }
            break;

        case 88: // X

            // cut current selection

            if ( hasOption ) {
                store.commit( "saveState", createAction( Actions.CUT_SELECTION, { store }));
                preventDefault( event ); // override browser cut
            }
            break;

        case 90: // Z

            if ( hasOption ) {
                store.dispatch( !shiftDown ? "undo" : "redo" );
                preventDefault( event ); // override browser undo
            }
            break;

        case 189: // +
            store.commit( "setHigherKeyboardOctave", Math.max( editor.higherKeyboardOctave - 1, 1 ));
            break;

        case 187: // -
            store.commit( "setHigherKeyboardOctave", Math.min( editor.higherKeyboardOctave + 1, Config.MAX_OCTAVE ));
            break;

        case 219: // [
            store.commit( "setLowerKeyboardOctave", Math.max( editor.lowerKeyboardOctave - 1, 1 ));
            break;

        case 221: // ]
            store.commit( "setLowerKeyboardOctave", Math.min( editor.lowerKeyboardOctave + 1, Config.MAX_OCTAVE ));
            break;
    }
}

function handleKeyUp( aEvent: KeyboardEvent ): void {
    shiftDown = false;

    if ( optionDown ) {
        switch ( aEvent.keyCode ) {
            // Apple key
            case 224:   // Firefox
            case 17:    // Opera
            case 91:    // WebKit left key
            case 93:    // Webkit right key
                optionDown = false;
                break;

            case 16:
                store.commit( "setStepOnSelection", -1 );
                break;
        }
    }

    if ( !suspended ) {
        if ( typeof listener === "function" ) {
            listener( "up", aEvent.keyCode, aEvent );
        } else if ( !KeyboardService.hasOption( aEvent ) && !aEvent.shiftKey ) {
            if ( mode === MODES.NOTE_INPUT ) {
                NoteInputHandler.createNoteOffEvent( aEvent.keyCode );
            }
        }
    }
}

function handleFocus(): void {
    // when switching browser tabs it is possible these values were left active
    shiftDown = optionDown = false;
}

function handleInputForMode( keyCode: number ): void {
    switch ( mode ) {
        case MODES.NOTE_INPUT:
            NoteInputHandler.createNoteOnEvent( keyCode );
            break;
        case MODES.INSTRUMENT_SELECT:
            InstrumentSelectionHandler.setInstrument( keyCode );
            break;
        case MODES.PARAM_SELECT:
            ModuleParamHandler.handleParam( keyCode );
            break;
        case MODES.PARAM_VALUE:
            ModuleValueHandler.handleParam( keyCode );
            break;
    }
}

function setSelectedSlot( targetValue: number ): boolean {
    let value = targetValue;
    // moved into first slot of next instrument ? jump to next instrument
    if ( targetValue > MAX_SLOT ) {
        value = 0;
    } else if ( targetValue < 0 ) {
        value = MAX_SLOT;
    }
    if ( shiftDown ) {
        value = -1;
    }
    store.commit( "setSelectedSlot", value );
    return value !== targetValue;
}

function preventDefault( event: KeyboardEvent ): void {
    event.preventDefault();
    event.stopPropagation();
}

function handleDeleteActionForCurrentMode(): void {
    let event;
    switch ( mode ) {
        default:
            store.commit( "saveState", createAction(
                store.getters.hasSelection ? Actions.DELETE_SELECTION : Actions.DELETE_EVENT, { store })
            );
            break;
        case MODES.PARAM_VALUE:
        case MODES.PARAM_SELECT:
            event = state.song.activeSong.patterns[ store.getters.activePatternIndex ]
                         .channels[ state.editor.selectedInstrument ][ state.editor.selectedStep ];

            if ( !event || !event.mp ) {
                return;
            }
            store.commit( "saveState", createAction( Actions.DELETE_MODULE_AUTOMATION, { event }));
            break;
    }
}

// when holding down shift make a selection, otherwise clear selection

function handleSelectionOnVerticalMovement( event: KeyboardEvent ): void {
    if ( event && shiftDown ) {
        setSelectedSlot( 0 ); // will unset selected slot
        store.commit( "handleVerticalKeySelectAction", {
            keyCode: event.keyCode,
            selectedChannel: state.editor.selectedInstrument,
            selectedStep: state.editor.selectedStep
        });
    } else {
        store.commit( "clearSelection" );
    }
}
