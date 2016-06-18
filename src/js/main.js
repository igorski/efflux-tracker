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

const EditorModel                = require( "./model/EditorModel" );
const SelectionModel             = require( "./model/SelectionModel" );
const SongModel                  = require( "./model/SongModel" );
const StateModel                 = require( "./model/StateModel" );
const AudioController            = require( "./controller/AudioController" );
const HelpController             = require( "./controller/HelpController" );
const InstrumentController       = require( "./controller/InstrumentController" );
const KeyboardController         = require( "./controller/KeyboardController" );
const MenuController             = require( "./controller/MenuController" );
const MetaController             = require( "./controller/MetaController" );
const MidiController             = require( "./controller/MidiController" );
const ModuleParamController      = require( "./controller/ModuleParamController" );
const NoteEntryController        = require( "./controller/NoteEntryController" );
const NotificationController     = require( "./controller/NotificationController" );
const PatternEditorController    = require( "./controller/PatternEditorController" );
const PatternTrackListController = require( "./controller/PatternTrackListController" );
const SequencerController        = require( "./controller/SequencerController" );
const SettingsController         = require( "./controller/SettingsController" );
const SongBrowserController      = require( "./controller/SongBrowserController" );
const SystemController           = require( "./controller/SystemController" );
const ObjectUtil                 = require( "./utils/ObjectUtil" );
const SongUtil                   = require( "./utils/SongUtil" );
const TemplateUtil               = require( "./utils/TemplateUtil" );
const Messages                   = require( "./definitions/Messages" );
const Pubsub                     = require( "pubsub-js" );
const zMIDI                      = require( "zmidi" ).zMIDI;

/* initialize application */

// grab reference to application container in template

const container = document.querySelector( "#application" );

// WebAudio API not supported ? halt application start

if ( !AudioController.isSupported() ) {
    container.innerHTML = TemplateUtil.render( "notSupported" );
}
else {
    // prepare application model

    let songModel = new SongModel();

    const efflux = window.efflux =
    {
        EditorModel    : new EditorModel(),
        SelectionModel : new SelectionModel(),
        SongModel      : songModel,
        StateModel     : new StateModel(),
        Pubsub         : Pubsub,                // expose publishing / subscribe bus
        activeSong     : songModel.createSong() // create new empty song
    };

    // prepare view

    container.innerHTML += TemplateUtil.render( "index" );

    // initialize application controllers

    KeyboardController.init( efflux, SequencerController );
    AudioController.init( efflux, efflux.activeSong.instruments );
    SettingsController.init( document.body );
    MenuController.init( container.querySelector( "#menuSection" ), efflux );
    InstrumentController.init( container, efflux );
    MetaController.init( container.querySelector( "#metaSection" ), efflux, KeyboardController );
    SequencerController.init( container.querySelector( "#transportSection" ), efflux, AudioController );
    SongBrowserController.init( document.body, efflux );
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

    // controllers ready, initialize models

    songModel.init();

    // MIDI is currently only supported in Chrome

    if ( zMIDI.isSupported() )
        MidiController.init( efflux, AudioController, SequencerController );

    // subscribe to pubsub system to receive and broadcast messages across the application

    [
        Messages.LOAD_SONG,
        Messages.SAVE_STATE

    ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
}

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.LOAD_SONG:

            const song = ( typeof payload === "string" ) ? efflux.SongModel.getSongById( payload ) : payload;

            if ( song && song.meta && song.patterns ) {

                efflux.activeSong = ObjectUtil.clone( song );
                efflux.EditorModel.reset();
                efflux.EditorModel.amountOfSteps = song.patterns[ 0 ].steps;
                SongUtil.resetPlayState( efflux.activeSong.patterns ); // ensures saved song hasn't got "frozen" events
                Pubsub.publishSync( Messages.SONG_LOADED, song );
                efflux.StateModel.flush();
                efflux.StateModel.store();
            }
            break;

        case Messages.SAVE_STATE:

            // you might argue its wasteful to store full clones of the current
            // song content, however we're not running this in the limited memory space
            // of an Atari 2600 !! this should be just fine and hella fast

            efflux.StateModel.store( ObjectUtil.clone( efflux.activeSong ));
            break;
    }
}
