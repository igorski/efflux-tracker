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
var TIA        = require( "../definitions/TIA" );

/* private properties */

var container, element, slocum, keyboardController;
var soundSelect, noteSelect, octaveSelect, data, callback;

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

        // add listeners

        soundSelect.addEventListener( "change", handleSoundSelect );
        noteSelect.addEventListener ( "change", handleNoteSelect );

        element.querySelector( ".close-button" ).addEventListener( "click", handleReady );
    },

    /**
     * open note entry pane
     *
     * @param {Object} options
     * @param {Function} completeCallback
     */
    open : function( options, completeCallback )
    {
        data     = options || { sound: "", note: "", octave: "" };
        callback = completeCallback;

        setSelectOptions();

        Form.setSelectedOption( soundSelect, data.sound );
        handleSoundSelect( null );
        Form.setSelectedOption( noteSelect,  data.note );
        handleNoteSelect( null );
        Form.setSelectedOption( octaveSelect, data.octave );

        keyboardController.setListener( NoteEntryController );

        if ( !element.parentNode )
            container.appendChild( element );

        soundSelect.focus();
    },

    /* event handlers */

    handleKey : function( keyCode, event )
    {
        switch ( keyCode )
        {
            case 38: // up


                break;

            case 40: // down


                break;

            case 39: // right


                break;

            case 37: // left

                break;

            case 32: // spacebar

                break;

            case 27: // escape
            case 13: // enter
                handleReady();
                break;
        }
    }
};

/* private methods */

function handleReady()
{
    if ( element.parentNode ) {
        element.parentNode.removeChild( element );
    }

    if ( typeof callback === "function" )
    {
        data.sound  = Form.getSelectedOption( soundSelect );
        data.note   = Form.getSelectedOption( noteSelect );
        data.octave = Form.getSelectedOption( octaveSelect );

        callback( data );
    }
    callback = null;
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
    handleNoteSelect( aEvent );
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
}
