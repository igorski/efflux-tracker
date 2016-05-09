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
var Messages     = require( "../definitions/Messages" );
var Pubsub       = require( "pubsub-js" );
var EventHandler = require( "zjslib" ).EventHandler;

/* private properties */

var efflux, keyboardController,
    container, list, closeBtn, handler;

var SongBrowserController = module.exports =
{
    /**
     * initialize SongBrowserController, attach SongView template into give container
     *
     * @param containerRef
     * @param effluxRef
     * @param keyboardControllerRef
     */
    init : function( containerRef, effluxRef, keyboardControllerRef )
    {
        efflux             = effluxRef;
        keyboardController = keyboardControllerRef;

        // append SongBrowser template to page, see CSS toggles for visibility

        containerRef.appendChild( TemplateUtil.renderAsElement( "songBrowser" ));

        container = containerRef.querySelector( "#songBrowser" );
        list      = container.querySelector   ( ".songList" );
        closeBtn  = container.querySelector   ( ".close-button" );

        // add event listeners

        closeBtn.addEventListener( "click", handleClose );

        // add message listeners

        [
            Messages.CLOSE_OVERLAYS,
            Messages.OPEN_SONG_LIST

        ].forEach( function( msg )
        {
            Pubsub.subscribe( msg, handleBroadcast );
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

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.CLOSE_OVERLAYS:
            if ( payload !== SongBrowserController )
                handleClose();
            break;

        case Messages.OPEN_SONG_LIST:
            handleOpen();
            break;
    }
}

function handleOpen()
{
    var songs = efflux.SongModel.getSongs(), li;
    list.innerHTML = "";

    if ( songs.length === 0 ) {
        Pubsub.publishSync( Messages.SHOW_ERROR, "There are currently no songs available to load. Why not create one?" );
        return;
    }

    // create an EventHandler to hold references to all listeners (allows easy instant cleanup)
    disposeHandler();
    handler = new EventHandler();

    songs.forEach( function( song )
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

    keyboardController.setListener( SongBrowserController );
}

function handleClose()
{
    disposeHandler();
    container.classList.remove( "active" );
    Pubsub.publishSync( Messages.HIDE_BLIND );
}

function handleSongOpenClick( aEvent )
{
    var id = aEvent.target.getAttribute( "data-id" );
    Pubsub.publishSync( Messages.LOAD_SONG, id );
    handleClose();
}

function handleSongDeleteClick( aEvent )
{
    var id        = aEvent.target.parentNode.getAttribute( "data-id"),
        songModel = efflux.SongModel,
        song      = songModel.getSongById( id );

    if ( !song )
        return;

    var doDelete = confirm( "Are you sure you want to delete song '" + song.meta.title + "' ? This operation cannot be undone." );

    if ( doDelete ) {
        songModel.deleteSong( song );
        Pubsub.publishSync( Messages.OPEN_SONG_LIST ); // refresh list
    }
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
