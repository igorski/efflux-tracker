/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case Messages.TOGGLE_SEQUENCER_LOOP:
            handleLoopToggle( null );
            break;

        case Messages.SONG_LOADED:

            if ( looping )
                handleLoopToggle( null );

            SequencerController.setPlaying( false );
            SequencerController.update();
            break;
    }
}
