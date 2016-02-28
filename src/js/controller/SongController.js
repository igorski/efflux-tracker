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
var Handlebars     = require( "handlebars/dist/handlebars.runtime.min.js" );
var templates      = require( "../handlebars/templates" )( Handlebars );
var AssemblyPlugin = require( "../plugins/AssemblyPlugin" );
var Time           = require( "../utils/Time" );
var Pubsub         = require( "pubsub-js" );

/* private properties */

var container, slocum, list;

var SongController = module.exports =
{
    /**
     * initialize SongController, attach SongView template into give container
     *
     * @param containerRef
     * @param slocumRef
     */
    init : function( containerRef, slocumRef )
    {
        container = containerRef;
        slocum    = slocumRef;

        container.innerHTML += templates.songView();

        // grab references to elements in the template

        container.querySelector( "#songLoad"   ).addEventListener( "click", handleLoad );
        container.querySelector( "#songSave"   ).addEventListener( "click", handleSave );
        container.querySelector( "#songExport" ).addEventListener( "click", handleExport );

        // create a list container to show the songs when loading

        list = document.createElement( "div" );
        list.setAttribute( "id", "songList" );
        document.body.appendChild( list ); // see CSS for visiblity toggles

        list.addEventListener( "click", handleSongClick );
    }
};

/* private methods */

function handleLoad( aEvent )
{
    var songs = slocum.SongModel.getSongs(), li;
    list.innerHTML = "";

    songs.forEach( function( song )
    {
        li = document.createElement( "li" );
        li.setAttribute( "data-id", song.id );
        li.innerHTML = song.meta.title + " " + Time.timestampToDate( song.meta.created );

        list.appendChild( li );
    });

    list.classList.add( "active" );
}

function handleSave( aEvent )
{
    var song = slocum.activeSong;

    var hasContent = false;

    song.patterns.forEach( function( pattern )
    {
        pattern.channels.forEach( function( channel )
        {
            channel.forEach( function( pattern )
            {
                if ( pattern && pattern.sound ) {
                    hasContent = true;
                }
            });
        })
    });

    if ( !hasContent ) {
        Pubsub.publish( "SHOW_ERROR", "Song has no pattern content!" );
        return;
    }

    if ( song.meta.author.length === 0 || song.meta.title.length === 0 )
        hasContent = false;

    if ( hasContent ) {
        slocum.SongModel.saveSong( song );
        Pubsub.publish( "SHOW_FEEDBACK", "Song '" + song.meta.title + "' saved" );
    }
    else {
        Pubsub.publish( "SHOW_ERROR", "Song author and title are required when saving" );
    }
}

function handleSongClick( aEvent )
{
    if ( aEvent.target.nodeName === "LI" )
    {
        var id = aEvent.target.getAttribute( "data-id" );
        Pubsub.publish( "LOAD_SONG", id );
        list.classList.remove( "active" );
    }
}

function handleExport( aEvent )
{
    var song = slocum.activeSong;
    var asm  = AssemblyPlugin.assemblify( song );

    // download file to disk

    var pom = document.createElement( "a" );
    pom.setAttribute( "href", "data:text/plain;charset=utf-8," + encodeURIComponent( asm ));
    pom.setAttribute( "download", "song.h" );
    pom.click();
}
