function startApplication() {

    // subscribe to pubsub system to receive and broadcast messages across the application

    [
        Messages.TRANSFORM_LEGACY_SONG,

    ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
}

// TODO: move this a general controller and treat this file as an application bootstrap

function handleBroadcast( type, payload )
{
    switch ( type ) {


        case Messages.TRANSFORM_LEGACY_SONG:

            if ( typeof payload === "object" )
                SongValidator.transformLegacy( payload );
            break;
    }
}
