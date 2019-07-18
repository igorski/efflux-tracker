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

let editorModel, sequencerController, stateModel, selectionModel, listener,
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

const KeyboardController =
{
    /**
     * initialize KeyboardController
     */
    init( effluxRef, aSequencerController )
    {
        editorModel         = effluxRef.EditorModel;
        stateModel          = effluxRef.StateModel;
        selectionModel      = effluxRef.SelectionModel;
        sequencerController = aSequencerController;

        window.addEventListener( "keydown", handleKeyDown );
        window.addEventListener( "keyup",   handleKeyUp );
        window.addEventListener( "focus",   handleFocus );

        NoteInputHandler.init( effluxRef, aSequencerController );
        InstrumentSelectionHandler.init( effluxRef );
        ModuleParamHandler.init( effluxRef );
        ModuleValueHandler.init( effluxRef );

        [ Messages.HIGHLIGHTED_SLOT_CHANGED ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    },

    /**
     * whether the Apple option or a control key is
     * currently held down for the given event
     *
     * @param {Event} aEvent
     * @returns {boolean}
     */
    hasOption( aEvent )
    {
        return ( optionDown === true ) || aEvent.ctrlKey;
    },

    /**
     * whether the shift key is currently held down
     *
     * @returns {boolean}
     */
    hasShift()
    {
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
    setListener( listenerRef )
    {
        listener = listenerRef;
    },

    /**
     * the KeyboardController can be suspended so it
     * will not fire its callback to the listeners
     *
     * @param {boolean} value
     */
    setSuspended( value )
    {
        suspended = value;
    },

    /**
     * whether to block default behaviour on certain keys
     *
     * @param value
     */
    setBlockDefaults( value )
    {
        blockDefaults = value;
    },

    reset : function()
    {
        KeyboardController.setListener( null );
        KeyboardController.setSuspended( false );
        KeyboardController.setBlockDefaults( true );
    }
};

export default KeyboardController;

/* private handlers */

function handleBroadcast( msg, payload ) {
    switch ( msg ) {
        case Messages.HIGHLIGHTED_SLOT_CHANGED:
            updateMode();
            break;
    }
}

function handleKeyDown( aEvent )
{
    if ( !suspended )
    {
        const keyCode    = aEvent.keyCode,
              curStep    = editorModel.activeStep,
              curChannel = editorModel.activeInstrument; // the current step position and channel within the pattern

        shiftDown = !!aEvent.shiftKey;

        // prevent defaults when using the arrows, space (prevents page jumps) and backspace (navigate back in history)

        if ( blockDefaults && DEFAULT_BLOCKED.indexOf( keyCode ) > -1 )
            aEvent.preventDefault();

        if ( typeof listener === 'function' ) {
            listener( "down", keyCode, aEvent );
        }
        else {

            const hasOption = KeyboardController.hasOption( aEvent );

            if ( !hasOption && !shiftDown )
                handleInputForMode( keyCode );

            switch ( keyCode )
            {
                case 27: // escape
                    Pubsub.publishSync( Messages.CLOSE_OVERLAYS );
                    break;

                case 32: // spacebar
                    //Pubsub.publishSync( Messages.TOGGLE_SEQUENCER_PLAYSTATE ); sequencerModel.setPlaying(!sequencerModel.isPlaying);
                    break;

                // capture the apple key here as it is not recognized as a modifier

                case 224:   // Firefox
                case 17:    // Opera
                case 91:    // WebKit left key
                case 93:    // Webkit right key
                    optionDown = true;
                    break;

                case 38: // up

                    if ( --editorModel.activeStep < 0 )
                        editorModel.activeStep = 0;

                    // when holding down shift make a selection, otherwise clear selection

                    if ( aEvent && shiftDown ) {
                        setActiveSlot(); // will unset selected slot
                        selectionModel.handleVerticalKeySelectAction( keyCode, editorModel.activeInstrument, curStep, editorModel.activeStep );
                    } else
                        selectionModel.clearSelection();

                    handleKeyboardNavigation();
                    break;

                case 40: // down

                    const maxStep = efflux.activeSong.patterns[ editorModel.activePattern ].steps - 1;

                    if ( ++editorModel.activeStep > maxStep )
                        editorModel.activeStep = maxStep;

                    // when holding down shift make a selection, otherwise clear existing selection

                    if ( aEvent && shiftDown ) {
                        setActiveSlot(); // will unset selected slot
                        selectionModel.handleVerticalKeySelectAction( keyCode, editorModel.activeInstrument, curStep, editorModel.activeStep );
                    }
                    else
                        selectionModel.clearSelection();

                    handleKeyboardNavigation();
                    break;

                case 39: // right

                    if ( hasOption ) {
                        Pubsub.publishSync( Messages.PATTERN_JUMP_NEXT );
                    }
                    else {
                        if ( setActiveSlot( editorModel.activeSlot + 1 )) {
                            if ( ++editorModel.activeInstrument > MAX_CHANNEL ) {
                                if ( editorModel.activePattern < ( efflux.activeSong.patterns.length - 1 )) {
                                    this.setActivePattern(this.activePattern + 1);
                                    editorModel.activeInstrument = 0;
                                    Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                                }
                                else
                                    editorModel.activeInstrument = MAX_CHANNEL;
                            }
                        }

                        if ( shiftDown )
                            selectionModel.handleHorizontalKeySelectAction( keyCode, curChannel, editorModel.activeStep );
                        else
                            selectionModel.clearSelection();

                        handleKeyboardNavigation();
                    }
                    break;

                case 37: // left

                    if ( hasOption ) {
                        Pubsub.publishSync( Messages.PATTERN_JUMP_PREV );
                    }
                    else {
                        if ( setActiveSlot( editorModel.activeSlot - 1 )) {
                            if ( --editorModel.activeInstrument < 0 ) {
                                if ( editorModel.activePattern > 0 ) {
                                    this.setActivePattern(this.activePattern - 1);
                                    editorModel.activeInstrument = MAX_CHANNEL;
                                    Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                                }
                                else
                                    editorModel.activeInstrument = 0;
                            }
                        }
                        updateMode();

                        if ( shiftDown ) {
                            minSelect = Math.max( --maxSelect, 0 );
                            selectionModel.handleHorizontalKeySelectAction( keyCode, curChannel, editorModel.activeStep );
                        }
                        else
                            selectionModel.clearSelection();

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
                         if ( !selectionModel.hasSelection() ) {
                             selectionModel.setSelectionChannelRange( editorModel.activeInstrument );
                             selectionModel.setSelection( editorModel.activeStep );
                         }
                         selectionModel.copySelection( efflux.activeSong, editorModel.activePattern );
                         selectionModel.clearSelection();
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
                        Pubsub.publishSync( Messages.TOGGLE_SEQUENCER_LOOP );
                        aEvent.preventDefault();
                    }
                    break;

                case 82: // R
                    if ( hasOption ) {
                        //Pubsub.publishSync( Messages.TOGGLE_INPUT_RECORDING ); sequencerModel.setRecording(true);
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
                        Pubsub.publishSync(
                            Messages.SAVE_STATE,
                            StateFactory.getAction( States.PASTE_SELECTION, {
                                efflux: efflux,
                                updateHandler: () => Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW )
                            })
                        );
                    }
                    break;

                case 88: // X

                    // cut current selection

                    if ( hasOption )
                    {
                        Pubsub.publishSync(
                            Messages.SAVE_STATE,
                            StateFactory.getAction( States.CUT_SELECTION, {
                                efflux: efflux,
                                updateHandler: () => Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW )
                            })
                        );
                    }
                    break;

                case 90: // Z

                    if ( hasOption )
                    {
                        const action = !shiftDown ? 'undo' : 'redo';
                        HistoryModule[action].then(() => {
                            Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );

                            // this is wasteful, can we do this more elegantly?
                            EventUtil.linkEvents( efflux.activeSong.patterns, efflux.eventList );
                        });
                    }
                    break;

                case 189: // +
                    editorModel.higherKeyboardOctave = Math.max( editorModel.higherKeyboardOctave - 1, 1 );
                    break;

                case 187: // -
                    editorModel.higherKeyboardOctave = Math.min( editorModel.higherKeyboardOctave + 1, Config.MAX_OCTAVE );
                    break;

                case 219: // [
                    editorModel.lowerKeyboardOctave = Math.max( editorModel.lowerKeyboardOctave - 1, 1 );
                    break;

                case 221: // ]
                    editorModel.lowerKeyboardOctave = Math.min( editorModel.lowerKeyboardOctave + 1, Config.MAX_OCTAVE );
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
                selectionModel.actionCache.stepOnSelection = -1;
                break;
        }
    }

    if ( !suspended ) {
        if ( typeof listener === 'function' )
            listener( "up", aEvent.keyCode, aEvent );
        else if ( !KeyboardController.hasOption( aEvent ) && !aEvent.shiftKey ) {
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

    editorModel.activeSlot = value;
    updateMode();

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

function updateMode() {
    switch ( editorModel.activeSlot ) {
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
