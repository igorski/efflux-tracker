/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.SONG_LOADED:
            openWindow( getCopy( "SONG_LOADED_TITLE" ), getCopy( "SONG_LOADED", payload.meta.title ));
            break;

        case Messages.SHOW_ERROR:
            openWindow( getCopy( "ERROR_TITLE" ), payload );
            break;

        case Messages.SHOW_FEEDBACK:
            openWindow( getCopy( "SUCCESS_TITLE" ), payload );
            break;
    }
}
