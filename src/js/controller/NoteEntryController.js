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
var TemplateUtil = require( "../utils/TemplateUtil" );
var EventUtil    = require( "../utils/EventUtil" );
var EventFactory = require( "../factory/EventFactory" );
var Form         = require( "../utils/Form" );
var Manual       = require( "../definitions/Manual" );
var Messages     = require( "../definitions/Messages" );
var Pitch        = require( "../definitions/Pitch" );
var Pubsub       = require( "pubsub-js" );

/* private properties */

var container, element, efflux, keyboardController;
var instrumentSelect, noteList, octaveList, data, closeCallback;
var selectedNote, selectedOctave;

var NoteEntryController = module.exports =
{
    /**
     * initialize NoteEntryController
     *
     * @param containerRef
     * @param effluxRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, effluxRef, keyboardControllerRef )
    {
        container          = containerRef;
        efflux             = effluxRef;
        keyboardController = keyboardControllerRef;

        element = TemplateUtil.renderAsElement( "noteEntry" );

        // grab view elements

        instrumentSelect = element.querySelector( "#instrument" );

        // initialize keyboard and octave selectors

        var keyboard = element.querySelector( "#keyboardNotes" );
        noteList     = keyboard.querySelectorAll( "li" );
        keyboard.addEventListener( "click", handleKeyboardClick );

        var octaves = element.querySelector( "#octaves" );
        octaveList  = octaves.querySelectorAll( "li" );
        octaves.addEventListener( "click", handleOctaveClick );

        // add listeners

        element.querySelector( ".close-button" ).addEventListener  ( "click", handleClose );
        element.querySelector( ".help-button" ).addEventListener   ( "click", handleHelp );
        element.querySelector( ".confirm-button" ).addEventListener( "click", handleReady );

        // subscribe to messaging system

        [
            Messages.OPEN_NOTE_ENTRY_PANEL,
            Messages.CLOSE_OVERLAYS

        ].forEach( function( msg )
        {
            Pubsub.subscribe( msg, handleBroadcast );
        });
    },

    /* event handlers */

    handleKey : function( type, keyCode, event )
    {
        if ( type === "down" )
        {
            switch ( keyCode )
            {
                case 27: // escape
                    handleClose();
                    break;

                case 13: // enter
                    handleReady();
                    break;

                /* notes */

                case 67: // C
                    selectedNote = ( selectedNote === "C" ) ? "C#" : "C"; // jump between C and C#
                    setSelectedValueInList( noteList, selectedNote );
                    break;

                case 68: // D
                    selectedNote = ( selectedNote === "D" ) ? "D#" : "D"; // jump between D and D#
                    setSelectedValueInList( noteList, selectedNote );
                    break;

                case 69: // E
                    setSelectedValueInList( noteList, selectedNote = "E" );
                    break;

                case 70: // F
                    selectedNote = ( selectedNote === "F" ) ? "F#" : "F"; // jump between F and F#
                    setSelectedValueInList( noteList, selectedNote );
                    break;

                case 71: // G
                    selectedNote = ( selectedNote === "G" ) ? "G#" : "G"; // jump between C and C#
                    setSelectedValueInList( noteList, selectedNote );
                    break;

                case 65: // A
                    selectedNote = ( selectedNote === "A" ) ? "A#" : "A"; // jump between A and A#
                    setSelectedValueInList( noteList, selectedNote );
                    break;

                case 66: // B
                    setSelectedValueInList( noteList, selectedNote = "B" );
                    break;

                /* octaves */

                case 49: setSelectedValueInList( octaveList, 1 ); break;
                case 50: setSelectedValueInList( octaveList, 2 ); break;
                case 51: setSelectedValueInList( octaveList, 3 ); break;
                case 52: setSelectedValueInList( octaveList, 4 ); break;
                case 53: setSelectedValueInList( octaveList, 5 ); break;
                case 54: setSelectedValueInList( octaveList, 6 ); break;
                case 55: setSelectedValueInList( octaveList, 7 ); break;
                case 56: setSelectedValueInList( octaveList, 8 ); break;
            }
        }
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.OPEN_NOTE_ENTRY_PANEL:
            handleOpen( payload );
            break;

        case Messages.CLOSE_OVERLAYS:

            if ( payload !== NoteEntryController )
                handleClose();
            break;
    }
}

/**
 * open note entry pane
 *
 * @param {Function} completeCallback
 */
function handleOpen( completeCallback )
{
    var editorModel  = efflux.EditorModel,
        patternIndex = editorModel.activePattern,
        pattern      = efflux.activeSong.patterns[ patternIndex ],
        channelIndex = editorModel.activeInstrument,
        channel      = pattern.channels[ channelIndex ],
        event        = channel[ editorModel.activeStep ];

    data =
    {
        instrument   : ( event ) ? event.instrument : editorModel.activeInstrument,
        note         : ( event ) ? event.note       : "C",
        octave       : ( event ) ? event.octave     : 3,
        patternIndex : ( event ) ? event.seq.startMeasure : patternIndex,
        channelIndex : channelIndex, // always use channel index (event instrument might be associated w/ different channel lane)
        step         : editorModel.activeStep
    };

    Pubsub.publishSync( Messages.CLOSE_OVERLAYS, NoteEntryController ); // close open overlays
    Pubsub.publish( Messages.SHOW_BLIND );

    closeCallback = completeCallback;

    keyboardController.setBlockDefaults( false );
    keyboardController.setListener( NoteEntryController );

    setSelectedValueInList( noteList,   data.note );
    setSelectedValueInList( octaveList, data.octave );

    selectedNote   = data.note;
    selectedOctave = data.octave;

    Form.setSelectedOption( instrumentSelect, data.instrument );

    if ( !element.parentNode )
        container.appendChild( element );
}

function handleClose()
{
    if ( typeof closeCallback === "function" )
        closeCallback();

    Pubsub.publishSync( Messages.HIDE_BLIND );

    dispose();
}

function handleHelp( aEvent )
{
    window.open( Manual.NOTE_ENTRY_HELP, "_blank" );
}

function handleReady()
{
    data.instrument = parseFloat( Form.getSelectedOption( instrumentSelect ));
    data.note       = getSelectedValueFromList( noteList );
    data.octave     = parseFloat( getSelectedValueFromList( octaveList ));

    // update model and view

    if ( EventUtil.isValid( data )) {

        var pattern = efflux.activeSong.patterns[ data.patternIndex ],
            channel = pattern.channels[ data.channelIndex ],
            event   = channel[ data.step ];

        if ( !event )
            event = EventFactory.createAudioEvent();

        event.action     = 1; // noteOn
        event.instrument = data.instrument;
        event.note       = data.note;
        event.octave     = data.octave;

        Pubsub.publish( Messages.ADD_EVENT_AT_POSITION, [ event, {
            patternIndex : data.patternIndex,
            channelIndex : data.channelIndex,
            step         : data.step
        } ]);
    }
    handleClose();
}

function dispose()
{
    keyboardController.setBlockDefaults( true );

    if ( element.parentNode ) {
        element.parentNode.removeChild( element );
    }
    closeCallback = null;
}

/* note selection */

function handleKeyboardClick( aEvent )
{
    var target = aEvent.target;
    if ( target.nodeName === "LI" ) {
        selectedNote = target.getAttribute( "data-value" );
        setSelectedValueInList( noteList, selectedNote );
    }
}

/* octave select */

function handleOctaveClick( aEvent )
{
    var target = aEvent.target;
    if ( target.nodeName === "LI" ) {
        selectedOctave = target.getAttribute( "data-value" );
        setSelectedValueInList( octaveList, selectedOctave );
    }
}

/* list functions */

function setSelectedValueInList( list, value )
{
    value = value.toString();
    var i = list.length, option;

    while ( i-- )
    {
        option = list[ i ];

        if ( option.getAttribute( "data-value" ) === value )
            option.classList.add( "selected" );
        else
            option.classList.remove( "selected" );
    }
}

function getSelectedValueFromList( list )
{
    var i = list.length, option;
    while ( i-- )
    {
        option = list[ i ];
        if ( option.classList.contains( "selected" ))
            return option.getAttribute( "data-value" );
    }
    return null;
}
