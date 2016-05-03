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
var EditorModel                = require( "./model/EditorModel" );
var SongModel                  = require( "./model/SongModel" );
var AudioController            = require( "./controller/AudioController" );
var HelpController             = require( "./controller/HelpController" );
var InstrumentController       = require( "./controller/InstrumentController" );
var KeyboardController         = require( "./controller/KeyboardController" );
var MenuController             = require( "./controller/MenuController" );
var MetaController             = require( "./controller/MetaController" );
var MidiController             = require( "./controller/MidiController" );
var ModuleParamController      = require( "./controller/ModuleParamController" );
var NoteEntryController        = require( "./controller/NoteEntryController" );
var NotificationController     = require( "./controller/NotificationController" );
var PatternEditorController    = require( "./controller/PatternEditorController" );
var PatternTrackListController = require( "./controller/PatternTrackListController" );
var SequencerController        = require( "./controller/SequencerController" );
var SettingsController         = require( "./controller/SettingsController" );
var SongBrowserController      = require( "./controller/SongBrowserController" );
var SystemController           = require( "./controller/SystemController" );
var ObjectUtil                 = require( "./utils/ObjectUtil" );
var SongUtil                   = require( "./utils/SongUtil" );
var TemplateUtil               = require( "./utils/TemplateUtil" );
var Messages                   = require( "./definitions/Messages" );
var Pubsub                     = require( "pubsub-js" );
var zMIDI                      = require( "zmidi" ).zMIDI;

/* initialize application */

var efflux;

(function( ref )
{
    // grab reference to application container in template

    var container = document.querySelector( "#application" );

    // WebAudio API not supported ? halt application start

    if ( !AudioController.isSupported() ) {
        container.innerHTML = TemplateUtil.render( "notSupported" );
        return;
    }

    // prepare application model

    var songModel = new SongModel();

    efflux = ref.efflux =
    {
        Pubsub      : Pubsub,
        EditorModel : new EditorModel(),
        SongModel   : songModel,
        activeSong  : songModel.createSong() // create new empty song or load last available song
    };

    // prepare view

    container.innerHTML += TemplateUtil.render( "index" );

    // initialize application controllers

    KeyboardController.init();
    AudioController.init( efflux, efflux.activeSong.instruments );
    SettingsController.init( document.body, KeyboardController );
    MenuController.init( container.querySelector( "#menuSection" ), efflux );
    InstrumentController.init( container, efflux, KeyboardController );
    MetaController.init( container.querySelector( "#metaSection" ), efflux, KeyboardController );
    SequencerController.init( container.querySelector( "#transportSection" ), efflux, AudioController );
    SongBrowserController.init( document.body, efflux, KeyboardController );
    NoteEntryController.init( container, efflux, KeyboardController );
    ModuleParamController.init( container, efflux, KeyboardController );
    NotificationController.init( container );
    PatternEditorController.init( container.querySelector( "#patternEditor" ), efflux );
    PatternTrackListController.init(
        container.querySelector( "#patternContainer" ),
        efflux, KeyboardController
    );
    HelpController.init( container.querySelector( "#helpSection" ), efflux );
    SystemController.init();

    // MIDI is currently only supported in Chrome

    if ( zMIDI.isSupported() )
        MidiController.init( efflux, AudioController, SequencerController );

    // subscribe to pubsub system to receive and broadcast messages across the application

    Pubsub.subscribe( Messages.LOAD_SONG, handleBroadcast );

})( self );

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.LOAD_SONG:

            var song = efflux.SongModel.getSongById( payload );

            if ( song ) {
                efflux.activeSong = ObjectUtil.clone( song );
                efflux.EditorModel.reset();
                efflux.EditorModel.amountOfSteps = song.patterns[ 0 ].steps;
                SongUtil.resetPlayState( efflux.activeSong.patterns ); // ensures saved song hasn't got "frozen" events
                Pubsub.publishSync( Messages.SONG_LOADED, song );
            }
            break;
    }
}
