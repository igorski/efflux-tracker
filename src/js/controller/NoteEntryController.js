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
var Form         = require( "../utils/Form" );
var Messages     = require( "../definitions/Messages" );
var Pitch        = require( "../definitions/Pitch" );
var Pubsub       = require( "pubsub-js" );

/* private properties */

var container, element, tracker, keyboardController;
var instrumentSelect, noteList, octaveList, data, callback;
var selectedNote, selectedOctave;

var NoteEntryController = module.exports =
{
    /**
     * initialize NoteEntryController
     *
     * @param containerRef
     * @param trackerRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, trackerRef, keyboardControllerRef )
    {
        container          = containerRef;
        tracker            = trackerRef;
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
            handleOpen( payload[ 0 ], payload[ 1 ]);
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
 * @param {Object} options
 * @param {Function} completeCallback
 */
function handleOpen( options, completeCallback )
{
    Pubsub.publishSync( Messages.CLOSE_OVERLAYS, NoteEntryController ); // close open overlays

    data     = options;
    callback = completeCallback;

    keyboardController.setBlockDefaults( false );
    keyboardController.setListener( NoteEntryController );

    setSelectedValueInList( noteList, data.note );
    setSelectedValueInList( octaveList, data.octave );

    selectedNote = data.note;
    selectedOctave = data.octave;

    Form.setSelectedOption( instrumentSelect, data.instrument );

    if ( !element.parentNode )
        container.appendChild( element );
}

function handleClose()
{
    if ( typeof callback === "function" )
        callback( null );

    dispose();
}

function handleReady()
{
    if ( typeof callback === "function" )
    {
        data.instrument = Form.getSelectedOption( instrumentSelect );
        data.note       = getSelectedValueFromList( noteList );
        data.octave     = parseFloat( getSelectedValueFromList( octaveList ));

        callback( data );
    }
    dispose();
}

function dispose()
{
    keyboardController.setBlockDefaults( true );

    if ( element.parentNode ) {
        element.parentNode.removeChild( element );
    }
    callback = null;
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
