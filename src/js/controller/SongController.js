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
var Time             = require( "../utils/Time" );
var TemplateUtil     = require( "../utils/TemplateUtil" );
var SongUtil         = require( "../utils/SongUtil" );
var Pubsub           = require( "pubsub-js" );
var Messages         = require( "../definitions/Messages" );

/* private properties */

var container, tracker, keyboardController, list;

var SongController = module.exports =
{
    /**
     * initialize SongController, attach SongView template into give container
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

        var canImportExport  = ( typeof window.btoa !== "undefined" && typeof window.FileReader !== "undefined" );
        container.innerHTML += TemplateUtil.render( "songView", { addExport: canImportExport } );

        // grab references to elements in the template

        container.querySelector( "#songLoad"  ).addEventListener( "click", handleLoad );
        container.querySelector( "#songSave"  ).addEventListener( "click", handleSave );
        container.querySelector( "#songReset" ).addEventListener( "click", handleReset );

        if ( canImportExport ) {

            container.querySelector( "#songImport" ).addEventListener( "click", handleImport );
            container.querySelector( "#songExport" ).addEventListener( "click", handleExport );

        }

        // create a list container to show the songs when loading

        list = document.createElement( "ul" );
        list.setAttribute( "id", "songList" );
        document.body.appendChild( list ); // see CSS for visibility toggles

        list.addEventListener( "click", handleSongClick );

        // add message listeners
        Pubsub.subscribe( Messages.CLOSE_OVERLAYS, function( type, payload )
        {
            if ( payload !== SongController )
                handleClose()
        });
    },

    handleKey : function( type, keyCode, event )
    {
        if ( type === "down" && keyCode === 27 )
        {
            // close on escape key
            handleClose();
        }
    }
};

/* private methods */

function handleLoad( aEvent )
{
    Pubsub.publishSync( Messages.CLOSE_OVERLAYS, SongController ); // close open overlays

    var songs = tracker.SongModel.getSongs(), li;
    list.innerHTML = "";

    if ( songs.length === 0 ) {
        Pubsub.publishSync( Messages.SHOW_ERROR, "There are currently no songs available to load. Why not create one?" );
        return;
    }

    songs.forEach( function( song )
    {
        li = document.createElement( "li" );
        li.setAttribute( "data-id", song.id );
        li.innerHTML = "<span class='title'>" + song.meta.title + "</span><span class='date'>" + Time.timestampToDate( song.meta.created ) + "</span>";

        list.appendChild( li );
    });

    list.classList.add( "active" );

    keyboardController.setListener( SongController );
}

function handleSave( aEvent )
{
    var song = tracker.activeSong;

    if ( isValid( song )) {
        tracker.SongModel.saveSong( song );
        Pubsub.publishSync( Messages.SHOW_FEEDBACK, "Song '" + song.meta.title + "' saved" );
    }
}

function handleSongClick( aEvent )
{
    if ( aEvent.target.nodeName === "LI" )
    {
        var id = aEvent.target.getAttribute( "data-id" );
        Pubsub.publishSync( Messages.LOAD_SONG, id );
        list.classList.remove( "active" );
    }
}

function handleReset( aEvent )
{
    if ( confirm( "Are you sure you want to reset, you will lose all changes and undo history" )) {
        tracker.activeSong = tracker.SongModel.createSong();
        Pubsub.publishSync( Messages.SONG_LOADED, tracker.activeSong );
    }
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
        Pubsub.publishSync( Messages.SHOW_ERROR, "Song has no pattern content!" );
        return false;
    }

    if ( song.meta.author.length === 0 || song.meta.title.length === 0 )
        hasContent = false;

    if ( !hasContent )
        Pubsub.publishSync( Messages.SHOW_ERROR, "Song has no title or author name, take pride in your work!" );

    return hasContent;
}

function handleImport()
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
                Pubsub.publishSync( Messages.SONG_LOADED, song );
            }
        };
        // start reading file contents
        reader.readAsText( aEvent.target.files[ 0 ] );
    });
}

function handleExport()
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

function handleClose()
{
    list.classList.remove( "active" );
}
