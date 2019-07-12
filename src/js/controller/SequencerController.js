/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case Messages.PATTERN_AMOUNT_UPDATED:
        case Messages.PATTERN_SWITCH:
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

        // when a MIDI device is connected, we allow recording from MIDI input
        case Messages.MIDI_DEVICE_CONNECTED:
            recordBTN.classList.remove( "disabled" );
            break;

        case Messages.AUDIO_CONTEXT_READY:
            audioContext = payload;
            SequencerController.setPosition( 0 );
            break;
    }
}
