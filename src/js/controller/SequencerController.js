/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case Messages.PATTERN_AMOUNT_UPDATED:
            SequencerController.update();
            break;

        case Messages.PATTERN_JUMP_PREV:
            handlePatternNavBack( null );
            break;

        case Messages.PATTERN_JUMP_NEXT:
            handlePatternNavNext( null );
            break;

        case Messages.TOGGLE_SEQUENCER_LOOP:
            handleLoopToggle( null );
            break;

        case Messages.SONG_LOADED:

            if ( looping )
                handleLoopToggle( null );

            SequencerController.setPlaying( false );
            SequencerController.update();
            break;

        case Messages.AUDIO_CONTEXT_READY:
            audioContext = payload;
            SequencerController.setPosition( 0 );
            break;
    }
}
