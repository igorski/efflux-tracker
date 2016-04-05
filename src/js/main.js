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
var SongModel              = require( "./model/SongModel" );
var AudioController        = require( "./controller/AudioController" );
var HelpController         = require( "./controller/HelpController" );
var KeyboardController     = require( "./controller/KeyboardController" );
var MenuController         = require( "./controller/MenuController" );
var MetaController         = require( "./controller/MetaController" );
var NoteEntryController    = require( "./controller/NoteEntryController" );
var NotificationController = require( "./controller/NotificationController" );
var PatternController      = require( "./controller/PatternController" );
var SongController         = require( "./controller/SongController" );
var ObjectUtil             = require( "./utils/ObjectUtil" );
var TemplateUtil           = require( "./utils/TemplateUtil" );
var Messages               = require( "./definitions/Messages" );
var Pubsub                 = require( "pubsub-js" );

/* initialize */

var tracker;

(function( ref )
{
    // prepare application model

    tracker = ref.tracker =
    {
        SongModel : new SongModel()
    };

    // create new empty song or load last available song

    tracker.activeSong = tracker.SongModel.createSong();

    // prepare view

    var container = document.querySelector( "#application" );

    container.innerHTML += TemplateUtil.render( "index" );

    // initialize application controllers

    AudioController.init();
    KeyboardController.init( tracker );
    MenuController.init();
    SongController.init( container.querySelector( "#songSection" ), tracker, KeyboardController );
    MetaController.init( container.querySelector( "#metaSection" ), tracker, KeyboardController );
    NoteEntryController.init( container, tracker, KeyboardController );
    NotificationController.init( container );
    PatternController.init( container.querySelector( "#patternContainer" ), tracker, KeyboardController, NoteEntryController );
    HelpController.init( container.querySelector( "#helpSection" ), tracker );

    // subscribe to pubsub system to receive and broadcast messages across the application

    Pubsub.subscribe( Messages.LOAD_SONG, handleBroadcast );

})( self );

/* private handlers */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.LOAD_SONG:

            var song = tracker.SongModel.getSongById( payload );

            if ( song ) {
                tracker.activeSong = ObjectUtil.clone( song );
                Pubsub.publish( Messages.SONG_LOADED, song );
            }
            break;
    }
}
