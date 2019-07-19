function startApplication() {

    AudioController.init( efflux, efflux.activeSong.instruments );

    efflux.TemplateService.render( "index", container, null, true ).then(() => {

        // initialize application controllers

        InstrumentController.init( container, efflux, KeyboardController );
        NoteEntryController.init( container, efflux, KeyboardController );
        ModuleParamController.init( container, efflux, KeyboardController );
    });

    // subscribe to pubsub system to receive and broadcast messages across the application

    [
        Messages.TRANSFORM_LEGACY_SONG,
        Messages.SAVE_STATE

    ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
}

// TODO: move this a general controller and treat this file as an application bootstrap

function handleBroadcast( type, payload )
{
    switch ( type )


        case Messages.TRANSFORM_LEGACY_SONG:

            if ( typeof payload === "object" )
                SongValidator.transformLegacy( payload );
            break;


        case Messages.SAVE_STATE:

            // save changed state in StateModel for undo/redo purposes
            efflux.HistoryModule.store( payload );
            break;
    }
}
