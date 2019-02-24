/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - https://www.igorski.nl
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

const Copy         = require( "../i18n/Copy" );
const Time         = require( "../utils/Time" );
const Messages     = require( "../definitions/Messages" );
const Pubsub       = require( "pubsub-js" );
const EventHandler = require( "zjslib" ).EventHandler;

/* private properties */

let efflux, container, list, closeBtn, handler;

const SongBrowserController = module.exports =
{
    /**
     * initialize SongBrowserController, attach SongView template into give container
     *
     * @param containerRef
     * @param effluxRef
     */
    init( containerRef, effluxRef )
    {
        efflux = effluxRef;

        // append SongBrowser template to page, see CSS toggles for visibility

        efflux.TemplateService.renderAsElement( "songBrowser" ).then(( template ) => {

            containerRef.appendChild( template );

            container = containerRef.querySelector( "#songBrowser" );
            list      = container.querySelector   ( ".songList" );
            closeBtn  = container.querySelector   ( ".close-button" );

            // add event listeners

            closeBtn.addEventListener( "click", handleClose );
        });

        // subscribe to messaging system

        [
            Messages.CLOSE_OVERLAYS,
            Messages.OPEN_SONG_BROWSER

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.CLOSE_OVERLAYS:
            if ( payload !== SongBrowserController )
                handleClose();
            break;

        case Messages.OPEN_SONG_BROWSER:
            handleOpen();
            break;
    }
}

function handleOpen()
{
    const songs = efflux.SongModel.getSongs();
    let li;
    list.innerHTML = "";

    if ( songs.length === 0 ) {
        Pubsub.publishSync( Messages.SHOW_ERROR, getCopy( "ERROR_NO_SONGS" ));
        return;
    }

    // create an EventHandler to hold references to all listeners (allows easy instant cleanup)
    disposeHandler();
    handler = new EventHandler();

    songs.forEach(( song ) =>
    {
        li = document.createElement( "li" );
        li.setAttribute( "data-id", song.id );
        li.innerHTML = "<span class='title'>" + song.meta.title + ", by " + song.meta.author + "</span>" +
            "<span class='date'>" + Time.timestampToDate( song.meta.modified ) + "</span>" +
            "<span class='delete'>x</span>";

        list.appendChild( li );

        handler.addEventListener( li, "click", handleSongOpenClick );
        handler.addEventListener( li.querySelector( ".delete" ), "click", handleSongDeleteClick );
    });

    Pubsub.publishSync( Messages.CLOSE_OVERLAYS, SongBrowserController );
    Pubsub.publishSync( Messages.SHOW_BLIND );
    container.classList.add( "active" );
}

function handleClose()
{
    disposeHandler();
    container.classList.remove( "active" );
    Pubsub.publishSync( Messages.HIDE_BLIND );
}

function handleSongOpenClick( aEvent )
{
    const id = aEvent.target.getAttribute( "data-id" );
    Pubsub.publishSync( Messages.LOAD_SONG, id );
    handleClose();
}

function handleSongDeleteClick( aEvent )
{
    const id        = aEvent.target.parentNode.getAttribute( "data-id"),
          songModel = efflux.SongModel,
          song      = songModel.getSongById( id );

    if ( !song )
        return;

    Pubsub.publish( Messages.CONFIRM, {
        message:  getCopy( "SONG_DELETE_CONFIRM", song.meta.title ),
        confirm : function() {
            songModel.deleteSong( song );
            Pubsub.publishSync( Messages.OPEN_SONG_BROWSER ); // refreshes view
        },
        cancel : function() {
            Pubsub.publishSync( Messages.OPEN_SONG_BROWSER ); // refreshes view
        }
    });
}

/**
 * frees all event handlers attached to the created
 * SongBrowser DOM elements so they can be garbage collected
 */
function disposeHandler()
{
    if ( handler ) {
        handler.dispose();
        handler = null;
    }
}
