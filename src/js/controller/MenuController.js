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
var Time         = require( "../utils/Time" );
var TemplateUtil = require( "../utils/TemplateUtil" );
var SongUtil     = require( "../utils/SongUtil" );
var Pubsub       = require( "pubsub-js" );
var Messages     = require( "../definitions/Messages" );
var zMIDI        = require( "zmidi" ).zMIDI;

/* private properties */


var header, menu, toggle, tracker, songController;
var menuOpened = false; // whether menu is opened (mobile hamburger menu)

var MenuController = module.exports =
{
    /**
     * initialize MenuController, attach MenuView template into given container
     *
     * @param containerRef
     * @param trackerRef
     * @param songControllerRef
     */
    init : function( containerRef, trackerRef, songControllerRef )
    {
        tracker            = trackerRef;
        songController     = songControllerRef;

        var canImportExport  = ( typeof window.btoa !== "undefined" && typeof window.FileReader !== "undefined" );
        containerRef.innerHTML += TemplateUtil.render( "menuView", { addExport: canImportExport } );

        // grab references to elements in the template

        containerRef.querySelector( "#songLoad"  ).addEventListener( "click",   handleLoad );
        containerRef.querySelector( "#songSave"  ).addEventListener( "click",   handleSave );
        containerRef.querySelector( "#songReset" ).addEventListener( "click",   handleReset );
        containerRef.querySelector( "#settingsBtn" ).addEventListener( "click", handleSettings );

        if ( canImportExport ) {

            containerRef.querySelector( "#songImport" ).addEventListener( "click", handleImport );
            containerRef.querySelector( "#songExport" ).addEventListener( "click", handleExport );
        }

        if ( !zMIDI.isSupported() ) {
            // a bit cheap, the only setting we (for now) support is related to MIDI, if
            // no MIDI is supported, hide the settings button
            containerRef.querySelector( "#settingsBtn" ).style.display = "none";
        }

        // get reference to DOM elements

        menu   = document.getElementById( "menu" );
        header = document.getElementById( "header" );
        toggle = menu.querySelector( ".toggle" );

        // add event listeners

        toggle.addEventListener( "click",     handleToggle );
        menu.addEventListener  ( "mouseover", handleMouseOver );

        [
            Messages.WINDOW_RESIZED,
            Messages.CLOSE_OVERLAYS

        ].forEach( function( msg )
        {
            Pubsub.subscribe( msg, handleBroadcast );
        });
    }
};

/* event handlers */

function handleToggle( e )
{
    menuOpened = !menuOpened;

    if ( menuOpened )
    {
        menu.classList.add( "opened" );
        header.classList.add( "expanded" );

        document.body.style.overflow = "hidden"; // prevent scrolling main body when scrolling menu list
    }
    else {
        menu.classList.remove( "opened" );
        header.classList.remove( "expanded" );
        document.body.style.overflow = "auto";
    }
}

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.WINDOW_RESIZED: // also close menu on resize
        case Messages.CLOSE_OVERLAYS:

            if ( menuOpened )
                handleToggle( null );
            break;
    }
}

function handleMouseOver( aEvent )
{
    Pubsub.publish( Messages.DISPLAY_HELP, "helpTopicMenu" );
}

function handleLoad( aEvent )
{
    Pubsub.publish( Messages.CLOSE_OVERLAYS, MenuController ); // close open overlays
    Pubsub.publish( Messages.OPEN_SONG_LIST );
}

function handleSave( aEvent )
{
    var song = tracker.activeSong;

    if ( isValid( song )) {
        tracker.SongModel.saveSong( song );
        Pubsub.publish( Messages.SHOW_FEEDBACK, "Song '" + song.meta.title + "' saved" );
    }
}


function handleReset( aEvent )
{
    if ( confirm( "Are you sure you want to reset, you will lose all changes and undo history" )) {
        tracker.activeSong = tracker.SongModel.createSong();

        var editorModel = tracker.EditorModel;
        editorModel.activeInstrument =
        editorModel.activePattern    =
        editorModel.activeStep       = 0;
        editorModel.amountOfSteps    = tracker.activeSong.patterns[ 0 ].steps;

        Pubsub.publish( Messages.SONG_LOADED, tracker.activeSong );
    }
}

function handleSettings( aEvent )
{
    Pubsub.publish( Messages.CLOSE_OVERLAYS, MenuController ); // close open overlays
    Pubsub.publish( Messages.OPEN_SETTINGS_PANEL );
}

/**
 * validates whether the current state of the song is
 * eligible for saving / exporting
 *
 * @private
 * @param song
 */
function isValid( song )
{
    var hasContent = SongUtil.hasContent( song );

    if ( !hasContent ) {
        Pubsub.publish( Messages.SHOW_ERROR, "Song has no pattern content!" );
        return false;
    }

    if ( song.meta.author.length === 0 || song.meta.title.length === 0 )
        hasContent = false;

    if ( !hasContent )
        Pubsub.publish( Messages.SHOW_ERROR, "Song has no title or author name, take pride in your work!" );

    return hasContent;
}

function handleImport( aEvent )
{
    // inline handler to overcome blocking of the file select popup by the browser

    var fileBrowser = document.createElement( "input" );
    fileBrowser.setAttribute( "type",   "file" );
    fileBrowser.setAttribute( "accept", ".ztk" );

    var simulatedEvent = document.createEvent( "MouseEvent" );
    simulatedEvent.initMouseEvent( "click", true, true, window, 1,
                                   0, 0, 0, 0, false,
                                   false, false, false, 0, null );

    fileBrowser.dispatchEvent( simulatedEvent );
    fileBrowser.addEventListener( "change", function( aEvent )
    {
        var reader = new FileReader();

        reader.onload = function( e )
        {
            var fileData = e.target.result;
            var song     = JSON.parse( atob( fileData ));

            // rudimentary check if we're dealing with a valid song

            if ( song.meta && song.instruments && song.patterns )
            {
                tracker.SongModel.saveSong( song );
                tracker.activeSong = song;
                Pubsub.publish( Messages.SONG_LOADED, song );
            }
        };
        // start reading file contents
        reader.readAsText( aEvent.target.files[ 0 ] );
    });
}

function handleExport( aEvent )
{
    var song = tracker.activeSong;

    if ( isValid( song ) ) {

        // encode song data

        var data = btoa( JSON.stringify( song ));

        // download file to disk

        var pom = document.createElement( "a" );
        pom.setAttribute( "href", "data:application/json;charset=utf-8," + encodeURIComponent( data ));
        pom.setAttribute( "download", song.meta.title + ".ztk" );
        pom.click();
    }
}
