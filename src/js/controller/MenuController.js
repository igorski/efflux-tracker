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

const Config       = require( "../config/Config" );
const Copy         = require( "../i18n/Copy" );
const Time         = require( "../utils/Time" );
const TemplateUtil = require( "../utils/TemplateUtil" );
const SongUtil     = require( "../utils/SongUtil" );
const Pubsub       = require( "pubsub-js" );
const Messages     = require( "../definitions/Messages" );
const zMIDI        = require( "zmidi" ).zMIDI;

/* private properties */

let header, menu, toggle, efflux, songController;
let menuOpened = false; // whether menu is opened (mobile hamburger menu)

const MenuController = module.exports =
{
    /**
     * initialize MenuController, attach MenuView template into given container
     *
     * @param containerRef
     * @param effluxRef
     * @param songControllerRef
     */
    init( containerRef, effluxRef, songControllerRef )
    {
        efflux         = effluxRef;
        songController = songControllerRef;

        const canImportExport = ( typeof window.btoa !== "undefined" && typeof window.FileReader !== "undefined" );
        // on iOS and Safari recording isn't working as expected...
        const userAgent = window.navigator.userAgent;
        const canRecord = ( "Blob" in window && ( !userAgent.match(/(iPad|iPhone|iPod)/g ) && userAgent.match( /(Chrome)/g )) );

        containerRef.innerHTML += TemplateUtil.render( "menuView", {
            addExport : canImportExport,
            addSave   : canRecord
        });

        // grab references to elements in the template

        containerRef.querySelector( "#songLoad"  ).addEventListener( "click",   handleLoad );
        containerRef.querySelector( "#songSave"  ).addEventListener( "click",   handleSave );
        containerRef.querySelector( "#songReset" ).addEventListener( "click",   handleReset );
        containerRef.querySelector( "#settingsBtn" ).addEventListener( "click", handleSettings );

        if ( canImportExport ) {

            containerRef.querySelector( "#songImport" ).addEventListener( "click", handleImport );
            containerRef.querySelector( "#songExport" ).addEventListener( "click", handleExport );
        }

        if ( canRecord ) {

            containerRef.querySelector( "#audioRecord" ).addEventListener( "click", handleRecord );
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
            Messages.CLOSE_OVERLAYS,
            Messages.VALIDATE_AND_GET_SONG

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
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

        case Messages.VALIDATE_AND_GET_SONG:

            if ( isValid( efflux.activeSong ))
            {
                if ( typeof payload === "function" )
                    payload( efflux.activeSong );
            }
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
    Pubsub.publish( Messages.OPEN_SONG_BROWSER );
}

function handleSave( aEvent )
{
    const song = efflux.activeSong;

    if ( isValid( song )) {
        efflux.SongModel.saveSong( song );
        Pubsub.publish( Messages.SHOW_FEEDBACK, Copy.get( "SONG_SAVED", song.meta.title ));
    }
}


function handleReset( aEvent )
{
    // confirm unavailable to Chrome app
    // TODO: create inline confirmation popup
    const confirmed = ( window.chrome && chrome.app && chrome.app.runtime ) ? true : confirm( Copy.get( "WARNING_SONG_RESET" ));

    if ( confirmed ) {
        efflux.activeSong = efflux.SongModel.createSong();

        const editorModel = efflux.EditorModel;
        editorModel.activeInstrument =
        editorModel.activePattern    =
        editorModel.activeStep       = 0;
        editorModel.amountOfSteps    = efflux.activeSong.patterns[ 0 ].steps;

        Pubsub.publish( Messages.SONG_LOADED, efflux.activeSong );
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
    let hasContent = SongUtil.hasContent( song );

    if ( !hasContent ) {
        Pubsub.publish( Messages.SHOW_ERROR, Copy.get( "ERROR_EMPTY_SONG" ) );
        return false;
    }

    if ( song.meta.author.length === 0 || song.meta.title.length === 0 )
        hasContent = false;

    if ( !hasContent )
        Pubsub.publish( Messages.SHOW_ERROR, Copy.get( "ERROR_NO_META" ));

    return hasContent;
}

function handleImport( aEvent )
{
    // inline handler to overcome blocking of the file select popup by the browser

    const fileBrowser = document.createElement( "input" );
    fileBrowser.setAttribute( "type",   "file" );
    fileBrowser.setAttribute( "accept", Config.FILE_EXTENSION );

    const simulatedEvent = document.createEvent( "MouseEvent" );
    simulatedEvent.initMouseEvent( "click", true, true, window, 1,
                                   0, 0, 0, 0, false,
                                   false, false, false, 0, null );

    fileBrowser.dispatchEvent( simulatedEvent );
    fileBrowser.addEventListener( "change", ( fileBrowserEvent ) =>
    {
        const reader = new FileReader();

        reader.onload = ( readerEvent ) =>
        {
            const fileData = readerEvent.target.result;
            const song     = JSON.parse( atob( fileData ));

            // rudimentary check if we're dealing with a valid song

            if ( song.meta && song.instruments && song.patterns )
            {
                efflux.SongModel.saveSong( song );
                efflux.activeSong = song;
                Pubsub.publish( Messages.SONG_IMPORTED, song );
                Pubsub.publish( Messages.SONG_LOADED, song );
            }
        };
        // start reading file contents
        reader.readAsText( fileBrowserEvent.target.files[ 0 ] );
    });
}

function handleExport( aEvent )
{
    const song = efflux.activeSong;

    if ( isValid( song ) ) {

        // encode song data

        const data = serializeSong( song );

        // download file to disk

        const pom = document.createElement( "a" );
        pom.setAttribute( "href", "data:application/json;charset=utf-8," + encodeURIComponent( data ));
        pom.setAttribute( "download", song.meta.title + Config.FILE_EXTENSION );
        pom.click();

        Pubsub.publish( Messages.SONG_EXPORTED, song );
    }
}

function handleRecord( aEvent )
{
    Pubsub.publish( Messages.TOGGLE_RECORD_MODE );
    Pubsub.publish( Messages.SHOW_FEEDBACK, Copy.get( "RECORDING_ENABLED" ));
}

function serializeSong( song )
{
    return btoa( JSON.stringify( song ));
}
