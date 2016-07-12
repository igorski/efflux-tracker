/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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

const Config       = require( "../config/Config" );
const AudioUtil    = require( "../utils/AudioUtil" );
const EventUtil    = require( "../utils/EventUtil" );
const SongUtil     = require( "../utils/SongUtil" );
const LinkedList   = require( "../utils/LinkedList" );
const Messages     = require( "../definitions/Messages" );
const Metronome    = require( "../components/Metronome" );
const AudioFactory = require( "../model/factory/AudioFactory" );
const Bowser       = require( "bowser" );
const Pubsub       = require( "pubsub-js" );

/* private properties */

let efflux, audioController, audioContext, worker, editorModel,
    playBTN, loopBTN, recordBTN, settingsToggle, tempoSlider, currentPositionTitle,
    maxPositionTitle, metronomeToggle, tempoDisplay;

let playing           = false,
    looping           = false,
    recording         = false,
    scheduleAheadTime = .2,
    stepPrecision     = 64,
    beatAmount        = 4, // beat amount (the "3" in 3/4) and beat unit (the "4" in 3/4) describe the time signature
    beatUnit          = 4;

let queueHandlers = [], channelQueue = new Array( Config.INSTRUMENT_AMOUNT ),
    currentMeasure, measureStartTime, firstMeasureStartTime,
    currentStep, nextNoteTime, channels;

const SequencerController = module.exports =
{
    /**
     * initialize the SequencerController, attach view into
     * given container and hold a reference to the AudioController
     *
     * @public
     * @param {Element} containerRef
     * @param {Object} effluxRef
     * @param {AudioController} audioControllerRef
     */
    init( containerRef, effluxRef, audioControllerRef )
    {
        efflux          = effluxRef;
        audioController = audioControllerRef;
        audioContext    = audioControllerRef.getContext();
        editorModel     = efflux.EditorModel;

        // create LinkedLists to store all currently playing events for all channels

        for ( let i = 0; i < channelQueue.length; ++i )
            channelQueue[ i ] = new LinkedList();

        // render the transport controls in the DOM

        efflux.TemplateService.render( "transport", containerRef, null, true ).then(() => {

            // initialization

            SequencerController.setPosition( 0 );

            // cache view elements

            playBTN              = containerRef.querySelector( "#playBTN" );
            loopBTN              = containerRef.querySelector( "#loopBTN" );
            recordBTN            = containerRef.querySelector( "#recordBTN" );
            tempoDisplay         = containerRef.querySelector( "#songTempoDisplay" );
            tempoSlider          = containerRef.querySelector( "#songTempo" );
            metronomeToggle      = containerRef.querySelector( ".icon-metronome" );
            settingsToggle       = containerRef.querySelector( ".icon-settings" ); // mobile view only
            currentPositionTitle = document.querySelector( "#currentPattern .current" );
            maxPositionTitle     = document.querySelector( "#currentPattern .total" );

            // add event listeners

            playBTN.addEventListener        ( "click", handlePlayToggle );
            loopBTN.addEventListener        ( "click", handleLoopToggle );
            recordBTN.addEventListener      ( "click", handleRecordToggle );
            tempoSlider.addEventListener    ( "input", handleTempoChange );
            metronomeToggle.addEventListener( "click", handleMetronomeToggle );
            settingsToggle.addEventListener ( "click", handleSettingsToggle );
            document.querySelector( "#patternBack" ).addEventListener( "click", handlePatternNavBack );
            document.querySelector( "#patternNext" ).addEventListener( "click", handlePatternNavNext );

            // for desktop/laptop devices we enable record mode (for keyboard input)
            // if a MIDI device is connected on a mobile device, it is enabled again

            if ( !Bowser.ios && !Bowser.android )
                recordBTN.classList.remove( "disabled" );
        });


        // setup messaging system

        [
            Messages.MIDI_DEVICE_CONNECTED,
            Messages.TOGGLE_SEQUENCER_PLAYSTATE,
            Messages.TOGGLE_INPUT_RECORDING,
            Messages.SET_SEQUENCER_POSITION,
            Messages.PATTERN_AMOUNT_UPDATED,
            Messages.PATTERN_SWITCH,
            Messages.PATTERN_JUMP_PREV,
            Messages.PATTERN_JUMP_NEXT,
            Messages.SONG_LOADED

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));

        worker = new Worker( "../../workers/SequencerWorker.js" );
        worker.onmessage = ( msg ) =>
        {
            if ( msg.data.cmd === "collect" )
                collect();
        };
    },

    /**
     * query whether the Sequencer is currently playing
     * @return {boolean}
     */
    getPlaying()
    {
        return playing;
    },

    /**
     * start / stop the Sequencer
     * @param {boolean} value
     */
    setPlaying( value )
    {
        playing = value;
        let cl  = playBTN.classList;

        if ( playing ) {

            if ( recording && Metronome.countIn ) {
                Metronome.countInComplete = false;
                Metronome.enabled         = true;
            }
            currentStep = 0; // always start current measure from the beginning
            SequencerController.setPosition( efflux.EditorModel.activePattern );

            cl.add( "icon-stop" );
            cl.remove( "icon-play" );

            worker.postMessage({ "cmd" : "start" });

            Pubsub.publishSync( Messages.PLAYBACK_STARTED );
        }
        else {

            cl.add( "icon-play" );
            cl.remove( "icon-stop" );

            worker.postMessage({ "cmd" : "stop" });

            Pubsub.publishSync( Messages.PLAYBACK_STOPPED );

            if ( recording )
                handleRecordToggle();

            clearPending();
        }
    },

    /**
     * set the sequencers position
     *
     * @public
     * @param {number} measure
     * @param {number=} currentTime optional time to sync given measure to
     *        this will default to the currentTime of the AudioContext for instant enqueuing
     */
    setPosition( measure, currentTime )
    {
        let song = efflux.activeSong;
        if ( measure >= song.patterns.length )
            measure = song.patterns.length - 1;

        if ( currentMeasure !== measure )
            currentStep = 0;

        if ( typeof currentTime !== "number" )
            currentTime = audioContext.currentTime;

        currentMeasure        = measure;
        nextNoteTime          = currentTime;
        measureStartTime      = currentTime;
        firstMeasureStartTime = currentTime - ( measure * ( 60.0 / song.meta.tempo * beatAmount ));

        channels = efflux.activeSong.patterns[ currentMeasure ].channels;

        // when going to the first measure we should stop playing all currently sounding notes

        if ( currentMeasure === 0 ) {
            channelQueue.forEach( function( list, index ) {
                let q = list.head;
                while ( q ) {
                    dequeueEvent(q.data, currentTime );
                    q.remove();
                    q = list.head;
                }
            });
        }
    },

    getPosition()
    {
        return {
            measure: currentMeasure,
            step: currentStep
        }
    },

    /**
     * synchronize Transport contents with
     * the current state of the model
     */
    update()
    {
        const meta = efflux.activeSong.meta;
        tempoSlider.value      = meta.tempo;
        tempoDisplay.innerHTML = meta.tempo + " BPM";

        currentPositionTitle.innerHTML = ( editorModel.activePattern + 1 ).toString();
        maxPositionTitle.innerHTML     = efflux.activeSong.patterns.length.toString();
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case Messages.TOGGLE_SEQUENCER_PLAYSTATE:
            SequencerController.setPlaying( !playing );
            break;

        case Messages.TOGGLE_INPUT_RECORDING:
            handleRecordToggle();
            break;

        case Messages.SET_SEQUENCER_POSITION:
            SequencerController.setPosition( payload );
            break;

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

        case Messages.SONG_LOADED:

            if ( looping )
                handleLoopToggle( null );

            SequencerController.setPlaying( false );
            SequencerController.update();
            EventUtil.linkEvents( efflux.activeSong.patterns, efflux.eventList );
            break;

        // when a MIDI device is connected, we allow recording from MIDI input
        case Messages.MIDI_DEVICE_CONNECTED:
            recordBTN.classList.remove( "disabled" );
            break;
    }
}

function handlePlayToggle( e )
{
    SequencerController.setPlaying( !playing );
}

function handleLoopToggle( e )
{
    if ( looping = !looping )
        loopBTN.classList.add( "active" );
    else
        loopBTN.classList.remove( "active" );
}

function handleRecordToggle( e )
{
    const wasRecording = recording;

    if ( recording = !wasRecording )
        recordBTN.classList.add( "active" );
    else
        recordBTN.classList.remove( "active" );

    if ( wasRecording ) {

        // unflag the recorded state of all the events
        const patterns = efflux.activeSong.patterns;
        let event, i;

        patterns.forEach(( pattern ) =>
        {
            pattern.channels.forEach(( events ) =>
            {
                i = events.length;
                while ( i-- )
                {
                    event = events[ i ];
                    if ( event )
                        event.recording = false;
                }
            });
        });
    }
    efflux.EditorModel.recordingInput = recording;
}

function handleMetronomeToggle( e )
{
    let enabled = !Metronome.enabled;

    if ( enabled )
        metronomeToggle.classList.add( "active" );
    else
        metronomeToggle.classList.remove( "active" );

    Metronome.enabled = enabled;
}

function handleSettingsToggle( e )
{
    let body     = document.body,
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

function handleTempoChange( e )
{
    const meta     = efflux.activeSong.meta;
    const oldTempo = meta.tempo;
    const newTempo = parseFloat( e.target.value );

    meta.tempo = newTempo;

    // update existing event offsets by the tempo ratio

    SongUtil.updateEventOffsets( efflux.activeSong.patterns, ( oldTempo / newTempo ));

    Pubsub.publishSync( Messages.TEMPO_UPDATED, [ oldTempo, newTempo ]);
    SequencerController.update(); // sync with model
}

function collect()
{
    // adapted from http://www.html5rocks.com/en/tutorials/audio/scheduling/

    const sequenceEvents = !( recording && Metronome.countIn && !Metronome.countInComplete );
    let i, j, channel, event, compareTime;

    while ( nextNoteTime < ( audioContext.currentTime + scheduleAheadTime ))
    {
        if ( sequenceEvents )
        {
            compareTime = ( nextNoteTime - measureStartTime );
            i = channels.length;

            while ( i-- )
            {
                channel = channels[ i ];
                j = channel.length;

                while ( j-- )
                {
                    event = channel[ j ];

                    if ( event && !event.seq.playing && !event.recording &&
                         event.seq.startMeasure === currentMeasure &&
                         compareTime >= event.seq.startMeasureOffset &&
                         compareTime < ( event.seq.startMeasureOffset + event.seq.length ))
                    {
                        // enqueue into AudioContext queue at the right time
                        enqueueEvent( event, nextNoteTime, currentMeasure, i );
                    }
                }
            }
        }
        if ( Metronome.enabled ) // sound the metronome
            Metronome.play( 2, currentStep, stepPrecision, nextNoteTime, audioContext );

        // advance to next step position
        step();
    }
}

/**
 * advances the currently active step of the pattern
 * onto the next, when the end of pattern has been reached, the
 * pattern will either loop or we the Sequencer will progress onto the next pattern
 *
 * @private
 */
function step()
{
    const song          = efflux.activeSong;
    const totalMeasures = song.patterns.length;

    // Advance current note and time by the given subdivision...
    nextNoteTime += (( 60 / song.meta.tempo ) * 4 ) / stepPrecision;

    // advance the beat number, wrap to zero when start of next bar is enqueued

    if ( ++currentStep === stepPrecision )
    {
        currentStep = 0;

        // advance the measure if the Sequencer wasn't looping

        if ( !looping && ++currentMeasure === totalMeasures )
        {
            // last measure reached, jump back to first
            currentMeasure = 0;

            // stop playing if we're recording and looping is disabled

            if ( recording && !efflux.EditorModel.loopedRecording )
            {
                SequencerController.setPlaying( false );
                Pubsub.publishSync( Messages.RECORDING_COMPLETE );
                return;
            }
        }
        SequencerController.setPosition( currentMeasure, nextNoteTime );

        if ( recording )
        {
            // one bar metronome count in ?

            if ( Metronome.countIn && !Metronome.countInComplete ) {

                Metronome.enabled         = Metronome.restore;
                Metronome.countInComplete = true;

                currentMeasure        = 0;   // now we're actually starting!
                firstMeasureStartTime = audioContext.currentTime;
            }
        }
        switchPattern( currentMeasure );
    }
    Pubsub.publishSync( Messages.STEP_POSITION_REACHED, [ currentStep, stepPrecision ]);
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

/**
 * @private
 *
 * @param {AUDIO_EVENT} aEvent
 * @param {number} aTime AudioContext timestamp to start event playback
 * @param {number} aEventMeasure measure the event belongs to
 * @param {number} aEventChannel channel the event belongs to
 */
function enqueueEvent( aEvent, aTime, aEventMeasure, aEventChannel )
{
    aEvent.seq.playing = true; // lock the Event for further querying during its playback

    // calculate the total duration for the event

    const patternDuration = ( 60 / efflux.activeSong.meta.tempo ) * beatAmount;
    const patterns        = efflux.activeSong.patterns;

    aEvent.seq.mpLength = patternDuration / patterns[ aEventMeasure ].steps;

    // play back the event in the AudioController

    audioController.noteOn( aEvent, efflux.activeSong.instruments[ aEvent.instrument ], aTime );

    // events must also be dequeued (as they have a fixed duration)

    const isNoteOn = ( aEvent.action === 1 );
    const queue    = channelQueue[ aEventChannel ];

    if ( aEvent.action !== 0 ) {

        // all non-module parameter change events kill previously playing notes
        let playing = queue.head;

        while ( playing ) {
            dequeueEvent( playing.data, aTime );
            playing.remove();
            playing = queue.head;
        }
    }

    // non-noteOn events are dequeued after a single sequencer tick, noteOn
    // events are pushed in a queued and dequeued when a new noteOn/noteOff event
    // is enqueued for this events channel

    if ( !isNoteOn )
        dequeueEvent( aEvent, aTime + aEvent.seq.mpLength );
    else
        queue.add( aEvent );
}

/**
 * use a silent OscillatorNode as a strictly timed clock
 * for removing the AudioEvents from the AudioController
 *
 * @private
 *
 * @param {AUDIO_EVENT} aEvent
 * @param {number} aTime AudioContext timestamp to stop playback
 */
function dequeueEvent( aEvent, aTime )
{
//    console.warn("dequeue me: " + aEvent.note + aEvent.octave + " at " + aTime + " playing: " + aEvent.seq.playing);

    if ( !aEvent.seq.playing )
        return;

    let clock = AudioUtil.createTimer( audioContext, aTime, ( aTimerEvent ) =>
    {
        aEvent.seq.playing = false;
        audioController.noteOff( aEvent, efflux.activeSong.instruments[ aEvent.instrument ]);
        freeHandler( clock ); // clear reference to this timed event
    });

    // store reference to prevent garbage collection prior to callback execution !
    queueHandlers.push( clock );
}

function clearPending()
{
    SongUtil.resetPlayState( efflux.activeSong.patterns ); // unset playing state of existing events

    let i = queueHandlers.length;
    while ( i-- )
        freeHandler( queueHandlers[ i ]);

    for ( i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
        channelQueue[ i ].flush();
}

/**
 * free reference to given "clock" (makes it
 * eligible for garbage collection)
 *
 * @private
 * @param {OscillatorNode} aNode
 * @return {boolean}
 */
function freeHandler( aNode )
{
    aNode.disconnect();
    aNode.onended = null;

    const i = queueHandlers.indexOf( aNode );
    if ( i !== -1 )
        queueHandlers.splice( i, 1 );
}
