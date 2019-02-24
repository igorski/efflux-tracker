function startApplication() {

    AudioController.init( efflux, efflux.activeSong.instruments );

    efflux.TemplateService.render( "index", container, null, true ).then(() => {

        // initialize application controllers

        KeyboardController.init( efflux, SequencerController );
        SettingsController.init( efflux, document.body );
        InstrumentController.init( container, efflux, KeyboardController );
        SongEditorController.init( container.querySelector( "#songEditor" ), efflux, KeyboardController );
        SongBrowserController.init( document.body, efflux );
        NoteEntryController.init( container, efflux, KeyboardController );
        ModuleParamController.init( container, efflux, KeyboardController );
        NotificationController.init( container );
        TrackEditorController.init( container.querySelector( "#trackEditor" ), efflux );
        PatternTrackListController.init(
            container.querySelector( "#patternTrackListContainer" ),
            efflux, KeyboardController
        );
        AdvancedPatternEditorController.init( container, efflux, KeyboardController );

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
                efflux.HistoryModule.flush();
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
            efflux.HistoryModule.store( payload );
            break;
    }
}
