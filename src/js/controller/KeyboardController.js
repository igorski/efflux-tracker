/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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
"use strict";

const Config         = require( "../config/Config" );
const Messages       = require( "../definitions/Messages" );
const EventFactory   = require( "../model/factory/EventFactory" );
const EventUtil      = require( "../utils/EventUtil" );
const InstrumentUtil = require( "../utils/InstrumentUtil" );
const Pubsub         = require( "pubsub-js" );

let editorModel, sequencerController, stateModel, selectionModel, listener,
    suspended = false, blockDefaults = true, optionDown = false, shiftDown = false, minSelect = 0, maxSelect = 0;

const DEFAULT_BLOCKED = [ 8, 32, 37, 38, 39, 40 ],
      MAX_CHANNEL     = Config.INSTRUMENT_AMOUNT - 1,
      PATTERN_WIDTH   = 150; // width of a single track/pattern column TODO : move somewhere more applicable

// High notes:  2 3   5 6 7   9 0
//             Q W E R T Y U I O P
const HIGHER_KEYS = [ 81, 50, 87, 51, 69, 82, 53, 84, 54, 89, 55, 85, 73, 57, 79, 48, 80 ];

// Low notes:  S D   G H J   L ;
//            Z X C V B N M , . /
const LOWER_KEYS    = [ 90, 83, 88, 68, 67, 86, 71, 66, 72, 78, 74, 77, 188, 76, 190, 186, 191 ];
const KEY_NOTE_LIST = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E" ];

const KeyboardController = module.exports =
{
    /**
     * initialize KeyboardController
     */
    init( efflux, aSequencerController )
    {
        editorModel         = efflux.EditorModel;
        stateModel          = efflux.StateModel;
        selectionModel      = efflux.SelectionModel;
        sequencerController = aSequencerController;

        window.addEventListener( "keydown", handleKeyDown );
        window.addEventListener( "keyup",   handleKeyUp );
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
     * has been released. listenerRef requires a "handleKey"
     * function which receives three arguments:
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

/* private handlers */

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

        if ( listener && listener.handleKey ) {
            listener.handleKey( "down", keyCode, aEvent );
        }
        else {

            const hasOption = KeyboardController.hasOption( aEvent );

            if ( !hasOption && !aEvent.shiftKey )
                createNoteOnEvent( keyCode );

            switch ( keyCode )
            {
                case 27: // escape
                    Pubsub.publishSync( Messages.CLOSE_OVERLAYS );
                    break;

                case 32: // spacebar
                    Pubsub.publishSync( Messages.TOGGLE_SEQUENCER_PLAYSTATE );
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

                    if ( aEvent && aEvent.shiftKey )
                        selectionModel.handleVerticalKeySelectAction( keyCode, editorModel.activeInstrument, curStep, editorModel.activeStep );
                    else
                        selectionModel.clearSelection();

                    Pubsub.publishSync( Messages.HIGHLIGHT_ACTIVE_STEP );
                    break;

                case 40: // down

                    const maxStep = efflux.activeSong.patterns[ editorModel.activePattern ].steps - 1;

                    if ( ++editorModel.activeStep > maxStep )
                        editorModel.activeStep = maxStep;

                    // when holding down shift make a selection, otherwise clear existing selection

                    if ( aEvent && aEvent.shiftKey )
                        selectionModel.handleVerticalKeySelectAction( keyCode, editorModel.activeInstrument, curStep, editorModel.activeStep );
                    else
                        selectionModel.clearSelection();

                    Pubsub.publishSync( Messages.HIGHLIGHT_ACTIVE_STEP );
                    break;

                case 39: // right

                    if ( hasOption ) {
                        Pubsub.publishSync( Messages.PATTERN_JUMP_NEXT );
                    }
                    else {
                        if ( ++editorModel.activeInstrument > MAX_CHANNEL ) {
                            if ( editorModel.activePattern < ( efflux.activeSong.patterns.length - 1 )) {
                                ++editorModel.activePattern;
                                editorModel.activeInstrument = 0;
                                Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                            }
                            else
                                editorModel.activeInstrument = MAX_CHANNEL;

                            Pubsub.publishSync( Messages.PATTERN_SWITCH, editorModel.activePattern );
                        }
                        else if ( editorModel.activeInstrument > 2 )
                            Pubsub.publishSync( Messages.PATTERN_SET_HOR_SCROLL, (( editorModel.activeInstrument - 2 ) * PATTERN_WIDTH ));

                        if ( aEvent.shiftKey )
                            selectionModel.handleHorizontalKeySelectAction( keyCode, curChannel, editorModel.activeStep );
                        else
                            selectionModel.clearSelection();

                        Pubsub.publishSync( Messages.HIGHLIGHT_ACTIVE_STEP );
                    }
                    break;

                case 37: // left

                    if ( hasOption ) {
                        Pubsub.publishSync( Messages.PATTERN_JUMP_PREV );
                    }
                    else {
                        if ( --editorModel.activeInstrument < 0 ) {
                            if ( editorModel.activePattern > 0 ) {
                                --editorModel.activePattern;
                                editorModel.activeInstrument = 1;
                                Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                            }
                            else
                                editorModel.activeInstrument = 0;

                            Pubsub.publishSync( Messages.PATTERN_SWITCH, editorModel.activePattern );
                        }
                        else if ( editorModel.activeInstrument >= 0 )
                            Pubsub.publishSync( Messages.PATTERN_SET_HOR_SCROLL, ( editorModel.activeInstrument > 2 ) ? ( editorModel.activeInstrument * PATTERN_WIDTH ) : 0 );

                        if ( aEvent.shiftKey ) {
                            minSelect = Math.max( --maxSelect, 0 );
                            selectionModel.handleHorizontalKeySelectAction( keyCode, curChannel, editorModel.activeStep );
                        }
                        else
                            selectionModel.clearSelection();

                        Pubsub.publishSync( Messages.HIGHLIGHT_ACTIVE_STEP );
                    }
                    break;

                case 8:  // backspace
                    Pubsub.publishSync( Messages.REMOVE_NOTE_AT_POSITION );
                    handleKeyUp({ keyCode: 38, preventDefault: function() {} }); // move up to previous slot
                    break;

                case 13: // enter
                    if ( hasOption )
                        Pubsub.publishSync( Messages.EDIT_NOTE_FOR_STEP );
                    else
                        Pubsub.publishSync( Messages.EDIT_MOD_PARAMS_FOR_STEP );
                    break;

                case 46: // delete
                    Pubsub.publishSync( Messages.REMOVE_NOTE_AT_POSITION );
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

                case 75: // K
                    Pubsub.publishSync( Messages.ADD_OFF_AT_POSITION );
                    break;

                case 82: // R
                    if ( hasOption ) {
                        Pubsub.publishSync( Messages.TOGGLE_INPUT_RECORDING );
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
                        selectionModel.pasteSelection(
                            efflux.activeSong, editorModel.activePattern,
                            editorModel.activeInstrument, editorModel.activeStep, efflux.eventList
                        );
                        Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                        Pubsub.publishSync( Messages.SAVE_STATE );
                    }
                    break;

                case 88: // X

                    // cut current selection

                    if ( hasOption )
                    {
                        if ( !selectionModel.hasSelection() ) {
                            selectionModel.setSelectionChannelRange( editorModel.activeInstrument );
                            selectionModel.setSelection( editorModel.activeStep );
                        }
                        selectionModel.cutSelection( efflux.activeSong, editorModel.activePattern, efflux.eventList );
                        selectionModel.clearSelection();
                        Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                        Pubsub.publishSync( Messages.SAVE_STATE );
                    }
                    break;

                case 90: // Z

                    if ( hasOption )
                    {
                        let state;

                        if ( !aEvent.shiftKey )
                            state = stateModel.undo();
                        else
                            state = stateModel.redo();

                        if ( state ) {
                            efflux.activeSong = state;
                            Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );

                            // this is wasteful, can we do this more elegantly?
                            EventUtil.linkEvents( efflux.activeSong.patterns, efflux.eventList );
                        }
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

function handleKeyUp( aEvent )
{
    shiftDown = false;

    if ( optionDown )
    {
        switch ( aEvent.keyCode )
        {
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

        if ( listener && listener.handleKey )
            listener.handleKey( "up", aEvent.keyCode, aEvent );
        else if ( !KeyboardController.hasOption( aEvent ) && !aEvent.shiftKey )
            createNoteOffEvent( aEvent.keyCode );
    }
}

function createNoteOnEvent( keyCode )
{
    const note = getNoteForKey( keyCode );
    if ( note !== null ) {
        InstrumentUtil.noteOn(
            note,
            efflux.activeSong.instruments[ editorModel.activeInstrument ],
            editorModel.recordingInput,
            sequencerController
        );
    }
}

function createNoteOffEvent( keyCode )
{
    const note = getNoteForKey( keyCode );
    if ( note !== null )
        InstrumentUtil.noteOff( note, sequencerController );
}

/**
 * translates a key code to a note
 * if the key code didn't belong to the keys associated with notes, null is returned
 *
 * @param keyCode
 * @return {{ note: string, octave: number }|null}
 */
function getNoteForKey( keyCode )
{
    const higherIndex = HIGHER_KEYS.indexOf( keyCode );
    const lowerIndex  = LOWER_KEYS.indexOf( keyCode );

    let noteName, octave;

    if ( higherIndex > -1 ) {
        noteName = KEY_NOTE_LIST[ higherIndex ];
        octave   = editorModel.higherKeyboardOctave;
    }
    else if ( lowerIndex > -1 ) {
        noteName = KEY_NOTE_LIST[ lowerIndex ];
        octave   = editorModel.lowerKeyboardOctave;
    }
    else
        return null;

    return {
        note: noteName,
        octave: octave
    };
}
