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

const Config   = require( "../config/Config" );
const Messages = require( "../definitions/Messages" );
const Pubsub   = require( "pubsub-js" );

let editorModel, stateModel, selectionModel, listener, suspended = false,
    blockDefaults = true, optionDown = false, shiftDown = false,
    minSelect = 0, maxSelect = 0;

const DEFAULT_BLOCKED = [ 8, 32, 37, 38, 39, 40 ],
      MAX_CHANNEL     = Config.INSTRUMENT_AMOUNT - 1,
      PATTERN_WIDTH   = 150; // width of a single track/pattern column TODO : move somewhere more applicable

const KeyboardController = module.exports =
{
    /**
     * initialize KeyboardController
     */
    init( efflux )
    {
        editorModel    = efflux.EditorModel;
        stateModel     = efflux.StateModel;
        selectionModel = efflux.SelectionModel;

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
            listener.handleKey( "up", keyCode, aEvent );
        }
        else {
            switch ( aEvent.keyCode )
            {
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
                    break;

                case 37: // left

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
                    break;

                case 13: // enter
                    if ( KeyboardController.hasOption( aEvent ))
                        Pubsub.publishSync( Messages.EDIT_MOD_PARAMS_FOR_STEP );
                    else
                        Pubsub.publishSync( Messages.EDIT_NOTE_FOR_STEP );
                    break;

                case 8:  // backspace
                    Pubsub.publishSync( Messages.REMOVE_NOTE_AT_POSITION );
                    handleKeyUp({ keyCode: 38, preventDefault: function() {} }); // move up to previous slot
                    break;

                case 46: // delete
                    Pubsub.publishSync( Messages.REMOVE_NOTE_AT_POSITION );
                    handleKeyUp({ keyCode: 40, preventDefault: function() {} }); // move down to next slot
                    break;

                case 90: // Z

                    if ( KeyboardController.hasOption( aEvent ))
                    {
                        let state;

                        if ( !aEvent.shiftKey )
                            state = stateModel.undo();
                        else
                            state = stateModel.redo();

                        if ( state ) {
                            efflux.activeSong = state;
                            Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                        }
                    }

                    break;

                case 88: // X

                    // cut current selection

                    if ( KeyboardController.hasOption( aEvent ))
                    {
                        if ( !selectionModel.hasSelection() ) {
                            selectionModel.setSelectionChannelRange( editorModel.activeInstrument );
                            selectionModel.setSelection( editorModel.activeStep );
                        }
                        selectionModel.cutSelection( efflux.activeSong, editorModel.activePattern );
                        selectionModel.clearSelection();
                        Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                        Pubsub.publishSync( Messages.SAVE_STATE );
                    }
                    break;

                case 86: // V

                    // paste current selection
                    if ( KeyboardController.hasOption( aEvent )) {
                        selectionModel.pasteSelection(
                            efflux.activeSong, editorModel.activePattern, editorModel.activeInstrument, editorModel.activeStep
                        );
                        Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                        Pubsub.publishSync( Messages.SAVE_STATE );
                    }
                    break;

                case 67: // C

                    // copy current selection
                    if ( KeyboardController.hasOption( aEvent ))
                    {
                        if ( !selectionModel.hasSelection() ) {
                            selectionModel.setSelectionChannelRange( editorModel.activeInstrument );
                            selectionModel.setSelection( editorModel.activeStep );
                        }
                        selectionModel.copySelection( efflux.activeSong, editorModel.activePattern );
                        selectionModel.clearSelection();
                    }
                    break;

                case 79: // O
                    Pubsub.publishSync( Messages.ADD_OFF_AT_POSITION );
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

    if ( !suspended && listener && listener.handleKey )
        listener.handleKey( "down", aEvent.keyCode, aEvent );
}
