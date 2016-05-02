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
var Config       = require( "../config/Config" );
var AudioUtil    = require( "../utils/AudioUtil" );
var SongUtil     = require( "../utils/SongUtil" );
var TemplateUtil = require( "../utils/TemplateUtil" );
var Messages     = require( "../definitions/Messages" );
var Metronome    = require( "../components/Metronome" );
var AudioFactory = require( "../factory/AudioFactory" );
var Pubsub       = require( "pubsub-js" );

/* private properties */

var tracker, audioController, audioContext, worker, editorModel;
var playBTN, loopBTN, recordBTN, tempoSlider, currentPositionTitle, maxPositionTitle, metronomeToggle, tempoDisplay;

var playing           = false,
    looping           = false,
    recording         = false,
    scheduleAheadTime = .2,
    stepPrecision     = 64,
    beatAmount        = 4, // beat amount (the "3" in 3/4) and beat unit (the "4" in 3/4) describe the time signature
    beatUnit          = 4;

var currentMeasure, measureStartTime, firstMeasureStartTime,
    currentStep, nextNoteTime, channels, measureLength = 2, queueHandlers = [];

var SequencerController = module.exports =
{
    /**
     * initialize the SequencerController, attach view into
     * given container and hold a reference to the AudioController
     *
     * @public
     * @param {Element} containerRef
     * @param {Object} trackerRef
     * @param {AudioController} audioControllerRef
     */
    init : function( containerRef, trackerRef, audioControllerRef )
    {
        tracker         = trackerRef;
        audioController = audioControllerRef;
        audioContext    = audioControllerRef.getContext();
        editorModel     = tracker.EditorModel;

        containerRef.innerHTML += TemplateUtil.render( "transport" );

        // initialization

        SequencerController.setPosition( 0 );

        // cache view elements

        playBTN              = containerRef.querySelector( "#playBTN" );
        loopBTN              = containerRef.querySelector( "#loopBTN" );
        recordBTN            = containerRef.querySelector( "#recordBTN" );
        tempoDisplay         = containerRef.querySelector( "#songTempoDisplay" );
        tempoSlider          = containerRef.querySelector( "#songTempo" );
        metronomeToggle      = containerRef.querySelector( ".icon-metronome" );
        currentPositionTitle = document.querySelector( "#currentPattern .current" );
        maxPositionTitle     = document.querySelector( "#currentPattern .total" );

        // add event listeners

        playBTN.addEventListener        ( "click", handlePlayToggle );
        loopBTN.addEventListener        ( "click", handleLoopToggle );
        recordBTN.addEventListener      ( "click", handleRecordToggle );
        tempoSlider.addEventListener    ( "input", handleTempoChange );
        metronomeToggle.addEventListener( "click", handleMetronomeToggle );
        document.querySelector( "#patternBack" ).addEventListener( "click", handlePatternNavBack );
        document.querySelector( "#patternNext" ).addEventListener( "click", handlePatternNavNext );

        // setup messaging system

        [
            Messages.MIDI_DEVICE_CONNECTED,
            Messages.TOGGLE_SEQUENCER_PLAYSTATE,
            Messages.SET_SEQUENCER_POSITION,
            Messages.PATTERN_AMOUNT_UPDATED,
            Messages.PATTERN_SWITCH,
            Messages.LOAD_SONG,
            Messages.SONG_LOADED

        ].forEach( function( msg ) {
            Pubsub.subscribe( msg, handleBroadcast );
        });

        worker = new Worker( Config.getBasePath() + "SequencerWorker.js" );
        worker.onmessage = function( msg )
        {
            if ( msg.data.cmd === "collect" )
                collect();
        };
    },

    /**
     * query whether the Sequencer is currently playing
     * @return {boolean}
     */
    getPlaying : function()
    {
        return playing;
    },

    /**
     * start / stop the Sequencer
     * @param {boolean} value
     */
    setPlaying : function( value )
    {
        playing = value;
        var cl  = playBTN.classList;

        if ( playing ) {

            if ( recording && Metronome.countIn ) {
                Metronome.countInComplete = false;
                Metronome.enabled         = true;
            }
            currentStep = 0; // always start current measure from the beginning
            SequencerController.setPosition( tracker.EditorModel.activePattern );

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
    setPosition : function( measure, currentTime )
    {
        var song = tracker.activeSong;
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

        channels = tracker.activeSong.patterns[ currentMeasure ].channels;
    },

    getPosition : function()
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
    update : function()
    {
        var meta = tracker.activeSong.meta;
        tempoSlider.value      = meta.tempo;
        tempoDisplay.innerHTML = meta.tempo + " BPM";
        measureLength = ( 60.0 / meta.tempo ) * beatAmount;

        currentPositionTitle.innerHTML = ( editorModel.activePattern + 1 ).toString();
        maxPositionTitle.innerHTML     = tracker.activeSong.patterns.length.toString();
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

        case Messages.SET_SEQUENCER_POSITION:
            SequencerController.setPosition( payload );
            break;

        case Messages.LOAD_SONG:
            if ( looping )
                handleLoopToggle( null );
            SequencerController.setPlaying( false );
            break;

        case Messages.PATTERN_AMOUNT_UPDATED:
        case Messages.PATTERN_SWITCH:
        case Messages.SONG_LOADED:
            SequencerController.update();
            break;

        // when a MIDI device is connected, we allow recording from MIDI input
        case Messages.MIDI_DEVICE_CONNECTED:
            recordBTN.classList.add( "enabled" );
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
    if ( recording = !recording )
        recordBTN.classList.add( "active" );
    else
        recordBTN.classList.remove( "active" );

    tracker.EditorModel.recordingInput = recording;
}

function handleMetronomeToggle( e )
{
    var enabled = !Metronome.enabled;

    if ( enabled )
        metronomeToggle.classList.add( "active" );
    else
        metronomeToggle.classList.remove( "active" );

    Metronome.enabled = enabled;
}

function handlePatternNavBack( aEvent )
{
    if ( editorModel.activePattern > 0 )
        switchPattern( editorModel.activePattern - 1 );
}

function handlePatternNavNext( aEvent )
{
    var max = tracker.activeSong.patterns.length - 1;

    if ( editorModel.activePattern < max )
        switchPattern( editorModel.activePattern + 1 );
}

function handleTempoChange( e )
{
    var meta = tracker.activeSong.meta;

    var oldTempo = meta.tempo;
    var newTempo = parseFloat( e.target.value );
    meta.tempo   = newTempo;

    // update existing event offsets by the tempo ratio

    SongUtil.updateEventOffsets( tracker.activeSong.patterns, ( oldTempo / newTempo ));

    Pubsub.publishSync( Messages.TEMPO_UPDATED, [ oldTempo, newTempo ]);
    SequencerController.update(); // sync with model
}

function collect()
{
    // adapted from http://www.html5rocks.com/en/tutorials/audio/scheduling/

    var sequenceEvents = !( recording && Metronome.countIn && !Metronome.countInComplete );
    var i, j, channel, event, compareTime;

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
    var song          = tracker.activeSong;
    var totalMeasures = song.patterns.length;

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

            if ( recording && !tracker.EditorModel.loopedRecording )
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

    var newSteps = tracker.activeSong.patterns[ newMeasure ].steps;
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

    var patternDuration = ( 60 / tracker.activeSong.meta.tempo ) * beatAmount;
    var patterns        = tracker.activeSong.patterns;
    var duration        = ( 1 / patterns[ aEventMeasure ].channels[ aEventChannel ].length ) * patternDuration;

    if ( aEvent.action === 1 ) // but only for "noteOn" events
    {
        var foundEvent = false, foundEnd = false, compareEvent, channel, j, jl;

        for ( var i = aEventMeasure, l = patterns.length; i < l; ++i )
        {
            channel = patterns[ i ].channels[ aEventChannel ];

            for ( j = 0, jl = channel.length; j < jl; ++j )
            {
                compareEvent = channel[ j ];

                if ( !foundEvent )
                {
                    if ( compareEvent === aEvent )
                        foundEvent = true;
                }
                else if ( !foundEnd )
                {
                    // the next event (any event with an action) will
                    // halt the playback of the given event

                    if ( compareEvent && compareEvent.action > 0 ) {
                        foundEnd = true;
                        break;
                    }
                    duration += ( 1 / channel.length ) * patternDuration; // keep incrementing duration until event is found
                }
            }
            if ( foundEnd )
                break;
        }
    }
    aEvent.seq.length   = duration;
    aEvent.seq.mpLength = patternDuration / patterns[ aEventMeasure ].steps;

    // play back the event in the AudioController

    audioController.noteOn( aEvent, tracker.activeSong.instruments[ aEvent.instrument ], aTime );

    // noteOff will be triggered by the Sequencer

    dequeueEvent( aEvent, aTime + aEvent.seq.length );
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
    var clock = AudioUtil.createTimer( audioContext, aTime, function( e )
    {
        aEvent.seq.playing = false;
        audioController.noteOff( aEvent, tracker.activeSong.instruments[ aEvent.instrument ]);
        freeHandler( clock ); // clear reference to this timed event
    });

    // store reference to prevent garbage collection prior to callback execution !
    queueHandlers.push( clock );
}

function clearPending()
{
    SongUtil.resetPlayState( tracker.activeSong.patterns ); // unset playing state of existing events

    var i = queueHandlers.length;
    while ( i-- )
        freeHandler( queueHandlers[ i ]);
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

    var i = queueHandlers.indexOf( aNode );
    if ( i !== -1 )
        queueHandlers.splice( i, 1 );
}
