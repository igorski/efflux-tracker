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
var Handlebars = require( "handlebars/dist/handlebars.runtime.min.js" );
var templates  = require( "../handlebars/templates" )( Handlebars );
var Form       = require( "../utils/Form" );
var NoteUtil   = require( "../utils/NoteUtil" );
var Messages   = require( "../definitions/Messages" );
var TIA        = require( "../definitions/TIA" );
var Pubsub     = require( "pubsub-js" );

/* private properties */

var container, element, slocum, keyboardController;
var soundSelect, noteSelect, octaveSelect, accentSelect, data, callback;

var NoteEntryController = module.exports =
{
    /**
     * initialize NoteEntryController
     *
     * @param containerRef
     * @param slocumRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, slocumRef, keyboardControllerRef )
    {
        container          = containerRef;
        slocum             = slocumRef;
        keyboardController = keyboardControllerRef;

        element = document.createElement( "div" );
        element.setAttribute( "id", "noteEntry" );
        element.innerHTML = templates.noteEntry();

        soundSelect  = element.querySelector( "#sound" );
        noteSelect   = element.querySelector( "#note" );
        octaveSelect = element.querySelector( "#octave" );
        accentSelect = element.querySelector( "#accent" );

        // add listeners

        soundSelect.addEventListener ( "change", handleSoundSelect );
        noteSelect.addEventListener  ( "change", handleNoteSelect );
        octaveSelect.addEventListener( "change", handleOctaveSelect );

        element.querySelector( ".close-button" ).addEventListener( "click", handleClose );

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

        data     = options || { sound: "", note: "", octave: "", accent: false };
        callback = completeCallback;

        keyboardController.setBlockDefaults( false );

        setSelectOptions();

        Form.setSelectedOption( soundSelect, data.sound );
        handleSoundSelect( null );

        if ( !NoteUtil.isPercussive( data.sound ))
        {
            Form.setSelectedOption( noteSelect,  data.note );
            handleNoteSelect( null );
            Form.setSelectedOption( octaveSelect, data.octave );
        }
        updateSelectStates();

        Form.setSelectedOption( accentSelect, data.accent );

        keyboardController.setListener( NoteEntryController );

        if ( !element.parentNode )
            container.appendChild( element );

        soundSelect.focus();
    },

    /* event handlers */

    handleKey : function( type, keyCode, event )
    {
        if ( type === "down" )
        {
            switch ( keyCode )
            {
                case 38: // up


                    break;

                case 40: // down


                    break;

                case 27: // escape
                    handleClose();
                    break;

                case 13: // enter

                    if ( document.activeElement && document.activeElement === accentSelect )
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
        data.sound  = Form.getSelectedOption( soundSelect );
        data.note   = Form.getSelectedOption( noteSelect );
        data.octave = parseInt( Form.getSelectedOption( octaveSelect ), 10 );
        data.accent = ( Form.getSelectedOption( accentSelect ) === "true" );

        callback( data );
    }
    dispose();
}

function setSelectOptions()
{
    var tuning = slocum.activeSong.meta.tuning;
    var values = TIA.table.tunings[ tuning ];
    var perc   = TIA.table.PERCUSSION;

    var soundOptions = [];

    perc.forEach( function( p )
    {
        soundOptions.push({ title: p.note, value: p.note });
    });

    Object.keys( values ).forEach( function( key ) {
        soundOptions.push({ title: key, value: key });
    });

    Form.setOptions( soundSelect,  soundOptions );
    Form.setOptions( noteSelect,   [{ title: "----" }] );
    Form.setOptions( octaveSelect, [{ title: "----" }] );
}

function handleSoundSelect( aEvent )
{
    var sound = Form.getSelectedOption( soundSelect );
    var tuning = slocum.activeSong.meta.tuning;
    var values = TIA.table.tunings[ tuning ][ sound ];
    var noteOptions = [], collectedNotes = [], note;

    if ( values ) {
        Object.keys( values ).forEach( function( key )
        {
            note = values[ key ].note;
            if ( collectedNotes.indexOf( note ) === - 1 ) {
                noteOptions.push({ title: note, value: note });
                collectedNotes.push( note );
            }
        });
    }
    Form.setOptions( noteSelect, noteOptions );
    updateSelectStates();
    handleNoteSelect( aEvent );

    if ( !NoteUtil.isPercussive( sound )) {
        noteSelect.focus();
    }
    else {
        accentSelect.focus();
    }
}

function handleNoteSelect( aEvent )
{
    var sound  = Form.getSelectedOption( soundSelect );
    var note   = Form.getSelectedOption( noteSelect );
    var tuning = slocum.activeSong.meta.tuning;
    var values = TIA.table.tunings[ tuning ][ sound ];
    var octaveOptions = [], entry;

    if ( values )
    {
        for ( var i = 0; i < values.length; ++i )
        {
            entry = values[ i ];
            if ( entry.note === note )
                octaveOptions.push({ title: entry.octave, value: entry.octave });
        }
    }
    Form.setOptions( octaveSelect, octaveOptions );

    octaveSelect.focus();
}

function handleOctaveSelect( aEvent )
{
    requestAnimationFrame( function() {
        accentSelect.focus(); // prevents immediate close when selecting using enter
    });
}

function updateSelectStates()
{
    if ( NoteUtil.isPercussive( Form.getSelectedOption( soundSelect ) )) {
        noteSelect.classList.add( "disabled" );
        octaveSelect.classList.add( "disabled" );
    }
    else {
        noteSelect.classList.remove( "disabled" );
        octaveSelect.classList.remove( "disabled" );
    }
}

function dispose()
{
    keyboardController.setBlockDefaults( true );

    if ( element.parentNode ) {
        element.parentNode.removeChild( element );
    }
    callback = null;
}
