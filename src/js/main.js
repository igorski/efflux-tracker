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
var SongModel           = require( "./model/SongModel" );
var KeyboardController  = require( "./controller/KeyboardController" );
var MenuController      = require( "./controller/MenuController" );
var MetaController      = require( "./controller/MetaController" );
var NoteEntryController = require( "./controller/NoteEntryController" );
var PatternController   = require( "./controller/PatternController" );
var SongController      = require( "./controller/SongController" );
var Pubsub              = require( "pubsub-js" );

/* initialize */

var slocum;

(function( ref )
{
    // prepare application model

    slocum = ref.slocum =
    {
        SongModel : new SongModel()
    };

    // create new empty song or load last available song

    slocum.activeSong = slocum.SongModel.createSong();

    // initialize application controllers

    var container = document.querySelector( "#application" );

    KeyboardController.init( slocum );
    MenuController.init();
    SongController.init( container.querySelector( "#songSection" ), slocum );
    MetaController.init( container.querySelector( "#metaSection" ), slocum, KeyboardController );
    NoteEntryController.init( container, slocum, KeyboardController );
    PatternController.init( container, slocum, KeyboardController, NoteEntryController );

    // subscribe to pubsub system to receive and broadcast messages across the application

    Pubsub.subscribe( "LOAD_SONG", handleBroadcast );

})( self );

/* private handlers */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case "LOAD_SONG":

            var song = slocum.SongModel.getSongById( payload );

            if ( song ) {
                slocum.activeSong = song;
                Pubsub.publish( "SONG_LOADED", song );
            }
            break;
    }
}
