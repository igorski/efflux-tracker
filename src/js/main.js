/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2017 - http://www.igorski.nl
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

const Config                          = require( "./config/Config" );
const EditorModel                     = require( "./model/EditorModel" );
const InstrumentModel                 = require( "./model/InstrumentModel" );
const SelectionModel                  = require( "./model/SelectionModel" );
const SettingsModel                   = require( "./model/SettingsModel" );
const SongModel                       = require( "./model/SongModel" );
const StateModel                      = require( "./model/StateModel" );
const SongValidator                   = require( "./model/validators/SongValidator" );
const AudioController                 = require( "./controller/AudioController" );
const ConfirmController               = require( "./controller/ConfirmController" );
const HelpController                  = require( "./controller/HelpController" );
const InstrumentController            = require( "./controller/InstrumentController" );
const KeyboardController              = require( "./controller/KeyboardController" );
const MenuController                  = require( "./controller/MenuController" );
const MetaController                  = require( "./controller/MetaController" );
const MidiController                  = require( "./controller/MidiController" );
const ModuleParamController           = require( "./controller/ModuleParamController" );
const NoteEntryController             = require( "./controller/NoteEntryController" );
const NotificationController          = require( "./controller/NotificationController" );
const PatternEditorController         = require( "./controller/PatternEditorController" );
const PatternTrackListController      = require( "./controller/PatternTrackListController" );
const AdvancedPatternEditorController = require( "./controller/AdvancedPatternEditorController" );
const SequencerController             = require( "./controller/SequencerController" );
const SettingsController              = require( "./controller/SettingsController" );
const SongBrowserController           = require( "./controller/SongBrowserController" );
const SystemController                = require( "./controller/SystemController" );
const ObjectUtil                      = require( "./utils/ObjectUtil" );
const EventUtil                       = require( "./utils/EventUtil" );
const SongUtil                        = require( "./utils/SongUtil" );
const LinkedList                      = require( "./utils/LinkedList" );
const TemplateService                 = require( "./services/TemplateService" );
const Messages                        = require( "./definitions/Messages" );
const Pubsub                          = require( "pubsub-js" );
const zMIDI                           = require( "zmidi" ).zMIDI;

/* initialize application */

// grab reference to application container in template

const container = document.querySelector( "#application" );

// prepare application actors

const efflux = window.efflux =
{
    // models

    EditorModel     : new EditorModel(),
    InstrumentModel : new InstrumentModel(),
    SelectionModel  : new SelectionModel(),
    SettingsModel   : new SettingsModel(),
    SongModel       : new SongModel(),
    StateModel      : new StateModel(),

    // services

    TemplateService : new TemplateService(),
    Pubsub          : Pubsub, // expose publishing / subscribe bus

    // song data

    /**
     * this will reference the currently active Song
     *
     * @type {SONG}
     */
    activeSong : null,

    /**
     * Each channel uses a LinkedList to quickly
     * link all events to each other (@see SequencerController)
     *
     * Array.<LinkedList>
     */
    eventList : new Array( Config.INSTRUMENT_AMOUNT )
};

// WebAudio API not supported ? halt application start

if ( !AudioController.isSupported() ) {
    haltApplicationStart();
}
else {

    setupApplicationModel();

    // initialize AudioController first, it sets up the audioContext, which is an evolving
    // standard and has been known to break on Safari updates, try/catch before continuing actual app bootstrap
    try {
        AudioController.init( efflux, efflux.activeSong.instruments );
        startApplication();
    }
    catch ( e ) {
        // we'd like to see this output in the console, stringified lookup
        // ensures this code remains in the production build
        if ( window.console )
            window["console"]["error"]( e );

        haltApplicationStart();
    }
}

/* private methods */

function setupApplicationModel() {
    // prepare linked audio event list

    for ( let i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
        efflux.eventList[ i ] = new LinkedList();

    // setup application models

    efflux.SettingsModel.init();
    efflux.InstrumentModel.init();
    efflux.SongModel.init();
    efflux.activeSong = efflux.SongModel.createSong();
}

function haltApplicationStart() {
    efflux.TemplateService.render( "notSupported", container );
}

function startApplication() {

    efflux.TemplateService.render( "index", container, null, true ).then(() => {

        // initialize application controllers

        KeyboardController.init( efflux, SequencerController );
        SettingsController.init( efflux, document.body );
        MenuController.init( container.querySelector( "#menuSection" ), efflux );
        InstrumentController.init( container, efflux, KeyboardController );
        MetaController.init( container.querySelector( "#metaSection" ), efflux, KeyboardController );
        SequencerController.init(
            container.querySelector( "#transportSection" ),
            efflux, AudioController, KeyboardController
        );
        SongBrowserController.init( document.body, efflux );
        NoteEntryController.init( container, efflux, KeyboardController );
        ModuleParamController.init( container, efflux, KeyboardController );
        NotificationController.init( container );
        PatternEditorController.init( container.querySelector( "#patternEditor" ), efflux );
        PatternTrackListController.init(
            container.querySelector( "#patternContainer" ),
            efflux, KeyboardController
        );
        AdvancedPatternEditorController.init( container, efflux, KeyboardController );
        HelpController.init( container.querySelector( "#helpSection" ), efflux );
        ConfirmController.init( container, efflux );
        SystemController.init();

        // MIDI is currently only supported in Chrome

        if ( zMIDI.isSupported() )
            MidiController.init( efflux, AudioController, SequencerController );
    });

    // subscribe to pubsub system to receive and broadcast messages across the application

    [
        Messages.LOAD_SONG,
        Messages.TRANSFORM_LEGACY_SONG,
        Messages.CREATE_LINKED_LISTS,
        Messages.SAVE_STATE

    ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
}

// TODO: move this a general controller and treat this file as an application bootstrap

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
                Pubsub.publishSync( Messages.CREATE_LINKED_LISTS );
                efflux.StateModel.flush();
            }
            break;

        case Messages.TRANSFORM_LEGACY_SONG:

            if ( typeof payload === "object" )
                SongValidator.transformLegacy( payload );
            break;

        case Messages.CREATE_LINKED_LISTS:
            EventUtil.linkEvents( efflux.activeSong.patterns, efflux.eventList );
            break;

        case Messages.SAVE_STATE:

            // save changed state in StateModel for undo/redo purposes
            efflux.StateModel.store( payload );
            break;
    }
}
