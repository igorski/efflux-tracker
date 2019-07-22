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
import Config                     from '../config';
import NoteInputHandler           from './keyboard/NoteInputHandler';
import InstrumentSelectionHandler from './keyboard/InstrumentSelectionHandler';
import ModuleParamHandler         from './keyboard/ModuleParamHandler';
import ModuleValueHandler         from './keyboard/ModuleValueHandler';
import Messages                   from '../definitions/Messages';
import States                     from '../definitions/States';
import StateFactory               from '../model/factory/StateFactory';
import EventUtil                  from '../utils/EventUtil';
import Pubsub                     from 'pubsub-js';

let store, state, listener,
    suspended = false, blockDefaults = true, optionDown = false, shiftDown = false, minSelect = 0, maxSelect = 0;

const DEFAULT_BLOCKED = [ 8, 32, 37, 38, 39, 40 ],
      MAX_CHANNEL     = Config.INSTRUMENT_AMOUNT - 1,
      MAX_SLOT        = 3;

// the different operating modes inside the PatternTrackList

const MODES = {
    NOTE_INPUT        : 0,
    INSTRUMENT_SELECT : 1,
    PARAM_SELECT      : 2,
    PARAM_VALUE       : 3
};

let mode = MODES.NOTE_INPUT;

/**
 * KeyboardService is a dedicated controller that listens to keyboard
 * input events, allowing combinations of keypresses to toggle application
 * editing modes across components and states.
 */
const KeyboardService =
{
    init(storeReference)
    {
        store = storeReference;
        state = store.state;

        // these handlers remain active for the entire application lifetime

        window.addEventListener('keydown', handleKeyDown );
        window.addEventListener('keyup',   handleKeyUp );
        window.addEventListener('focus',   handleFocus );

        // initialize the handlers for the individual sections
        // the respective components will trigger their enabled/disabled states

        NoteInputHandler.init(storeReference);
        InstrumentSelectionHandler.init(storeReference);
        ModuleParamHandler.init(storeReference);
        ModuleValueHandler.init(storeReference);
    },

    /**
     * whether the Apple option or a control key is
     * currently held down for the given event
     *
     * @param {Event} aEvent
     * @returns {boolean}
     */
    hasOption( aEvent ) {
        return ( optionDown === true ) || aEvent.ctrlKey;
    },

    /**
     * whether the shift key is currently held down
     *
     * @returns {boolean}
     */
    hasShift() {
        return ( shiftDown === true );
    },

    /**
     * attach a listener to receive updates whenever a key
     * has been released. listenerRef is a function
     * which receives three arguments:
     *
     * {string} type, either "up" or "down"
     * {number} keyCode, the keys keyCode
     * {Event} event, the keyboard event
     *
     * the listener is usually another Controller
     *
     * @param {Object|Function} listenerRef
     */
    setListener( listenerRef ) {
        listener = listenerRef;
    },

    /**
     * the KeyboardService can be suspended so it
     * will not fire its callback to the listeners
     *
     * @param {boolean} value
     */
    setSuspended( value ) {
        suspended = value;
    },

    /**
     * whether to block default behaviour on certain keys
     *
     * @param value
     */
    setBlockDefaults( value ) {
        blockDefaults = value;
    },

    reset() {
        KeyboardService.setListener( null );
        KeyboardService.setSuspended( false );
        KeyboardService.setBlockDefaults( true );
    },

    syncEditorSlot() {
        switch (state.editor.activeSlot) {
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
    },
};

export default KeyboardService;

/* internal methods */

function handleKeyDown( aEvent )
{
    if ( !suspended )
    {
        const keyCode    = aEvent.keyCode,
              curStep    = state.editor.activeStep,
              curChannel = state.editor.activeInstrument; // the current step position and channel within the pattern

        shiftDown = !!aEvent.shiftKey;

        // prevent defaults when using the arrows, space (prevents page jumps) and backspace (navigate back in history)

        if ( blockDefaults && DEFAULT_BLOCKED.indexOf( keyCode ) > -1 )
            aEvent.preventDefault();

        if ( typeof listener === 'function' ) {
            listener( "down", keyCode, aEvent );
        }
        else {

            const hasOption = KeyboardService.hasOption( aEvent );

            if ( !hasOption && !shiftDown )
                handleInputForMode( keyCode );

            switch ( keyCode )
            {
                case 27: // escape

                    // close dialog (if existing), else close overlay (if existing)
                    if (state.dialog)
                        store.commit('closeDialog');
                    else if (state.overlay)
                        store.commit('setOverlay', null);
                    break;

                case 32: // spacebar
                    store.commit('setPlaying', !state.sequencer.playing);
                    break;

                // capture the apple key here as it is not recognized as a modifier

                case 224:   // Firefox
                case 17:    // Opera
                case 91:    // WebKit left key
                case 93:    // Webkit right key
                    optionDown = true;
                    break;

                case 38: // up

                    store.commit('setActiveStep', state.editor.activeStep - 1);

                    // when holding down shift make a selection, otherwise clear selection

                    if ( aEvent && shiftDown ) {
                        setActiveSlot(); // will unset selected slot
                        store.commit('handleVerticalKeySelectAction', {
                            keyCode,
                            activeChannel: state.editor.activeInstrument,
                            curStep,
                            activeStep: state.editor.activeStep
                        });
                    } else
                        store.commit('clearSelection');

                    handleKeyboardNavigation();
                    break;

                case 40: // down

                    const maxStep = state.song.activeSong.patterns[ state.sequencer.activePattern ].steps - 1;
                    const targetStep = state.editor.activeStep + 1;
                    if (targetStep <= maxStep)
                        store.commit('setActiveStep', targetStep);

                    // when holding down shift make a selection, otherwise clear existing selection

                    if ( aEvent && shiftDown ) {
                        setActiveSlot(); // will unset selected slot
                        store.commit('handleVerticalKeySelectAction', {
                            keyCode,
                            activeChannel: state.editor.activeInstrument,
                            curStep,
                            activeStep: state.editor.activeStep
                        });
                    }
                    else
                        store.commit('clearSelection');

                    handleKeyboardNavigation();
                    break;

                case 39: // right

                    if ( hasOption ) {
                        store.commit('gotoNextPattern', state.song.activeSong);
                    }
                    else {
                        if (setActiveSlot(state.editor.activeSlot + 1)) {
                            // when we go right from the most right lane, move to the next pattern (when existing)
                            if (state.editor.activeInstrument + 1 > MAX_CHANNEL ) {
                                if (state.sequencer.activePattern < ( state.song.activeSong.patterns.length - 1 )) {
                                    store.commit('setActivePattern', state.sequencer.activePattern + 1);
                                    store.commit('setActiveInstrument', 0);
                                    Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                                }
                            } else {
                                store.commit('setActiveInstrument', state.editor.activeInstrument + 1);
                            }
                        }

                        if ( shiftDown )
                            store.commit('handleHorizontalKeySelectAction', {
                                keyCode,
                                activeChannelOnStart: curChannel,
                                activeStepOnStart: state.editor.activeStep
                            });
                        else
                            store.commit('clearSelection');

                        handleKeyboardNavigation();
                    }
                    break;

                case 37: // left

                    if ( hasOption ) {
                        store.commit('gotoPreviousPattern');
                    }
                    else {
                        if (setActiveSlot(state.editor.activeSlot - 1)) {
                            // when we go left from the most left lane, move to the previous pattern (when existing)
                            if (state.editor.activeInstrument - 1 < 0 ) {
                                if (state.editor.activePattern > 0 ) {
                                    store.commit('setActivePattern', state.sequencer.activePattern - 1);
                                    store.commit('setActiveInstrument', MAX_CHANNEL);
                                    Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                                }
                            } else {
                                store.commit('setActiveInstrument', state.editor.activeInstrument - 1);
                            }
                        }

                        if ( shiftDown ) {
                            minSelect = Math.max( --maxSelect, 0 );
                            store.commit('handleHorizontalKeySelectAction', {
                                keyCode,
                                activeChannelOnStart: curChannel,
                                activeStepOnStart: state.editor.activeStep
                            });
                        }
                        else
                            store.commit('clearSelection');

                        handleKeyboardNavigation();
                    }
                    break;

                case 8:  // backspace
                    handleDeleteActionForCurrentMode();
                    handleKeyUp({ keyCode: 38, preventDefault: function() {} }); // move up to previous slot
                    break;

                case 13: // enter
                    if ( hasOption )
                        Pubsub.publishSync( Messages.EDIT_NOTE_FOR_STEP );
                    else
                        Pubsub.publishSync( Messages.EDIT_MOD_PARAMS_FOR_STEP );
                    break;

                case 46: // delete
                    handleDeleteActionForCurrentMode();
                    handleKeyUp({ keyCode: 40, preventDefault: function() {} }); // move down to next slot
                    break;

                case 67: // C

                     // copy current selection
                     if ( hasOption )
                     {
                         if (!store.getters.hasSelection) {
                             store.commit('setSelectionChannelRange', { firstChannel: state.editor.activeInstrument });
                             store.commit('setSelection', state.editor.activeStep);
                         }
                         store.commit('copySelection', { song: state.song.activeSong, activePattern: state.sequencer.activePattern });
                         store.commit('clearSelection');
                     }
                     break;

                case 71: // G
                    if ( hasOption )
                        Pubsub.publishSync( Messages.GLIDE_PARAM_AUTOMATIONS );
                    break;

                case 75: // K
                    Pubsub.publishSync( Messages.ADD_OFF_AT_POSITION );
                    break;

                case 76: // L
                    if ( hasOption ) {
                        store.commit('setLooping', !state.sequencer.looping);
                        aEvent.preventDefault();
                    }
                    break;

                case 82: // R
                    if ( hasOption ) {
                        store.commit('setRecording', !state.sequencer.recording);
                        aEvent.preventDefault();
                    }
                    break;

                case 83: // S
                    if ( hasOption ) {
                        Pubsub.publishSync( Messages.SAVE_SONG );
                        aEvent.preventDefault();
                    }
                    break;

                case 86: // V

                    // paste current selection
                    if ( hasOption ) {
                        store.commit('saveState',
                            StateFactory.getAction( States.PASTE_SELECTION, {
                                store,
                                updateHandler: () => Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW )
                            })
                        );
                    }
                    break;

                case 88: // X

                    // cut current selection

                    if ( hasOption ) {
                        store.commit('saveState',
                            StateFactory.getAction( States.CUT_SELECTION, {
                                store,
                                updateHandler: () => Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW )
                            })
                        );
                    }
                    break;

                case 90: // Z

                    if ( hasOption ) {
                        const action = !shiftDown ? 'undo' : 'redo';
                        store.dispatch(action).then(() => {
                            Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );

                            // TODO this is wasteful, can we do this more elegantly?
                            EventUtil.linkEvents( state.song.activeSong.patterns, state.editor.eventList );
                        });
                    }
                    break;

                case 189: // +
                    store.commit('setHigherKeyboardOctave', Math.max(state.editor.higherKeyboardOctave - 1, 1));
                    break;

                case 187: // -
                    store.commit('setHigherKeyboardOctave', Math.min(state.editor.higherKeyboardOctave + 1, Config.MAX_OCTAVE));
                    break;

                case 219: // [
                    store.commit('setLowerKeyboardOctave', Math.max( state.editor.lowerKeyboardOctave - 1, 1));
                    break;

                case 221: // ]
                    store.commit('setLowerKeyboardOctave', Math.min( state.editor.lowerKeyboardOctave + 1, Config.MAX_OCTAVE));
                    break;
            }
        }
   }
}

function handleKeyUp( aEvent ) {
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
                store.commit('setStepOnSelection', -1);
                break;
        }
    }

    if ( !suspended ) {
        if ( typeof listener === 'function' )
            listener( "up", aEvent.keyCode, aEvent );
        else if ( !KeyboardService.hasOption( aEvent ) && !aEvent.shiftKey ) {
            if ( mode === MODES.NOTE_INPUT )
                NoteInputHandler.createNoteOffEvent( aEvent.keyCode );
        }
    }
}

function handleFocus( aEvent ) {
    // when switching tabs it is possible these values are still active
    shiftDown = optionDown = false;
}

function handleInputForMode( keyCode ) {
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

function setActiveSlot( targetValue ) {
    let value = targetValue;
    // moved into first slot of next instrument ? jump to next instrument
    if ( targetValue > MAX_SLOT )
        value = 0;
    else if ( targetValue < 0 )
        value = MAX_SLOT;
    if ( shiftDown )
        value = -1;

    store.commit('setActiveSlot', value);

    return ( value !== targetValue );
}

function handleDeleteActionForCurrentMode() {
    switch ( mode ) {
        default:
            Pubsub.publishSync( Messages.REMOVE_NOTE_AT_POSITION );
            break;
        case MODES.PARAM_VALUE:
        case MODES.PARAM_SELECT:
            Pubsub.publishSync( Messages.REMOVE_PARAM_AUTOMATION_AT_POSITION );
            break;
    }
}

function handleKeyboardNavigation() {
    Pubsub.publishSync( Messages.HIGHLIGHT_ACTIVE_STEP );
    Pubsub.publishSync( Messages.HANDLE_KEYBOARD_MOVEMENT );
}
