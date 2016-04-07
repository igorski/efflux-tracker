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
var Messages     = require( "../definitions/Messages" );
var Pitch        = require( "../definitions/Pitch" );
var Select       = require( "../ui/Select" );
var SelectList   = require( "../ui/SelectList" );
var Pubsub       = require( "pubsub-js" );

/* private properties */

var container, element, tracker, keyboardController;
var selectList, instrumentSelect, noteSelect, octaveSelect, data, callback;
var noteOptions = [], octaveOptions = [];

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
        tracker             = trackerRef;
        keyboardController = keyboardControllerRef;

        element = document.createElement( "div" );
        element.setAttribute( "id", "noteEntry" );
        element.innerHTML = TemplateUtil.render( "noteEntry" );

        noteSelect       = new Select( element.querySelector( "#note" ));
        octaveSelect     = new Select( element.querySelector( "#octave" ));
        instrumentSelect = new Select( element.querySelector( "#instrument" ));

        selectList = new SelectList(
            [ noteSelect, octaveSelect, instrumentSelect ],
            this, keyboardControllerRef
        );

        // set note and octave options

        Pitch.OCTAVE_SCALE.forEach( function( note )
        {
            noteOptions.push({ title: note, value: note });
        });

        for ( var i = 1; i <= 8; ++i )
            octaveOptions.push({ title: i, value: i });

        noteSelect.setOptions  ( noteOptions );
        octaveSelect.setOptions( octaveOptions );

        // add listeners

        element.querySelector( ".close-button" ).addEventListener  ( "click", handleClose );
        element.querySelector( ".confirm-button" ).addEventListener( "click", handleReady );

        Pubsub.subscribe( Messages.CLOSE_OVERLAYS, function( type, payload )
        {
            if ( payload !== NoteEntryController )
                handleClose();
        } );
    },

    /**
     * open note entry pane
     *
     * @param {Object} options
     * @param {Function} completeCallback
     */
    open : function( options, completeCallback )
    {
        Pubsub.publish( Messages.CLOSE_OVERLAYS, NoteEntryController ); // close open overlays

        data     = ( options && options.note !== "" ) ? options : { instrument: 1, note: "A", octave: 4 };
        callback = completeCallback;

        keyboardController.setBlockDefaults( false );

        setSelectOptions();

        instrumentSelect.setValue( data.instrument );
        noteSelect.setValue( data.note );
        octaveSelect.setValue( data.octave );

        keyboardController.setListener( NoteEntryController );

        if ( !element.parentNode )
            container.appendChild( element );

        selectList.focus( 0, true );
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
            }
        }
    }
};

/* private methods */

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
        data.instrument = instrumentSelect.getValue();
        data.note       = noteSelect.getValue();
        data.octave     = parseInt( octaveSelect.getValue(), 10 );

        callback( data );
    }
    dispose();
}

function setSelectOptions()
{
    var instrumentOptions = [];

    tracker.activeSong.instruments.forEach( function( instrument ) {
        instrumentOptions.push({ title: instrument.name, value: instrument.id });
    });
    instrumentSelect.setOptions( instrumentOptions );
}

function dispose()
{
    keyboardController.setBlockDefaults( true );

    if ( element.parentNode ) {
        element.parentNode.removeChild( element );
    }
    callback = null;
}
