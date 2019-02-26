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

function handleSettingsToggle( e )
{
    let body     = window.document.body,
        cssClass = "settings-mode",
        enabled  = !body.classList.contains( cssClass );

    if ( enabled )
        e.target.classList.add( "active" );
    else
        e.target.classList.remove( "active" );

    body.classList.toggle( cssClass );
}

function handlePatternNavBack( aEvent )
{
    if ( editorModel.activePattern > 0 )
        switchPattern( editorModel.activePattern - 1 );
}

function handlePatternNavNext( aEvent )
{
    const max = efflux.activeSong.patterns.length - 1;

    if ( editorModel.activePattern < max )
        switchPattern( editorModel.activePattern + 1 );
}

function switchPattern( newMeasure )
{
    if ( editorModel.activePattern === newMeasure )
        return;

    currentMeasure = editorModel.activePattern = newMeasure;
    Pubsub.publishSync( Messages.PATTERN_SWITCH, newMeasure );

    const newSteps = efflux.activeSong.patterns[ newMeasure ].steps;
    if ( editorModel.amountOfSteps !== newSteps ) {
        editorModel.amountOfSteps = newSteps;
        Pubsub.publish( Messages.PATTERN_STEPS_UPDATED, newSteps );
    }
}
