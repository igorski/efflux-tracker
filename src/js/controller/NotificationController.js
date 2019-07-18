/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {

        case Messages.SHOW_ERROR:
            openWindow( getCopy( "ERROR_TITLE" ), payload );
            break;

        case Messages.SHOW_FEEDBACK:
            openWindow( getCopy( "SUCCESS_TITLE" ), payload );
            break;
    }
}
