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
var TemplateUtil = require( "../utils/TemplateUtil" );
var Messages     = require( "../definitions/Messages" );
var AudioFactory = require( "../factory/AudioFactory" );
var Pubsub       = require( "pubsub-js" );

/* private properties */

var tracker, audioController, audioContext, worker;
var playBTN, tempo, tempoDisplay;

var playing = false, looping = false, recording = false,
    scheduleAheadTime = .1, subdivisions = 64;  // these determine sequencing accuracy

var currentMeasure, firstMeasureStartTime, startTime, currentMeasureOffset, currentSubdivision, nextNoteTime, queueHandlers = [];

var beatAmount = 4, beatUnit = 4; // time signature (beat amount is upper numeral (i.e. the "3" in 3/4) while beat unit is the lower numeral)

var metronome                = false,
    metronomeRestore         = false,
    metronomeCountIn         = false,
    metronomeCountInComplete = false;

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
    init :  function( containerRef, trackerRef, audioControllerRef )
    {
        tracker         = trackerRef;
        audioController = audioControllerRef;
        audioContext    = audioControllerRef.getContext();

        containerRef.innerHTML += TemplateUtil.render( "transport" );

        // cache view elements

        playBTN      = containerRef.querySelector( "#playBTN" );
        tempoDisplay = containerRef.querySelector( "#songTempoDisplay" );
        tempo        = containerRef.querySelector( "#songTempo" );

        // add event listeners

        playBTN.addEventListener( "click", handlePlayToggle );
        tempo.addEventListener  ( "input", handleTempoChange );

        // setup messaging system

        Pubsub.subscribe( Messages.SONG_LOADED, handleBroadcast );

        worker = new Worker( "SequencerWorker.js" );
        worker.onmessage = function( msg )
        {
            if ( msg.data.cmd === "step" )
                scheduler();
        };
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

            currentSubdivision    = 0;
            nextNoteTime          =
            firstMeasureStartTime =
            currentMeasureOffset  =
            startTime             = audioContext.currentTime;
            currentMeasure        = 1;

            if ( recording && metronomeCountIn )
            {
                metronomeCountInComplete = false;
                metronome                = true;
            }

            cl.add( "icon-stop" );
            cl.remove( "icon-play" );

            worker.postMessage({ "cmd" : "start" });
        }
        else {
            cl.add( "icon-play" );
            cl.remove( "icon-stop" );

            worker.postMessage({ "cmd" : "stop" });
        }
    },

    /**
     * synchronize Transport contents with
     * the current state of the model
     */
    update : function()
    {
        var meta = tracker.activeSong.meta;
        tempoDisplay.innerHTML = meta.tempo + " BPM";
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch( type )
    {
        case Messages.SONG_LOADED:
            SequencerController.setPlaying( false );
            SequencerController.update();
            break;
    }
}

function handlePlayToggle( e )
{
    SequencerController.setPlaying( !playing );
}

function handleTempoChange( e )
{
    var meta   = tracker.activeSong.meta;
    meta.tempo = parseFloat( e.target.value );

    SequencerController.update(); // sync with model
}

function scheduler()
{
    // adapted from http://www.html5rocks.com/en/tutorials/audio/scheduling/
    //
    // during each call, we schedule Web Audio events not only for any notes that need to be played now (e.g. the
    // very first note), but also any notes that need to be played between now and the next interval.
    // In fact, we don’t want to just look ahead by precisely the interval between setTimeout() calls - we also need
    // some scheduling overlap between this timer call and the next, in order to accommodate the worst case main
    // thread behavior.
    //
    // we want the amount of “scheduling ahead” that we’re doing to be large enough to avoid any delays, but
    // not so large as to create noticeable delay when tweaking the tempo control.
    // e.g. a timeout interval of 25ms with a schedule ahead time of 100 ms has a resilient overlap (in regard
    // to timeout interruptions), however it will take longer (100 ms!) for changes to tempo etc. to take effect

    var scheduleNext = true;

    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while ( nextNoteTime < audioContext.currentTime + scheduleAheadTime )
    {
        scheduleNote( currentSubdivision, nextNoteTime );
        scheduleNext = nextNote();
    }
}

/**
 * @private
 * @return {boolean}
 */
function nextNote()
{
    var song          = tracker.activeSong;
    var totalMeasures = song.patterns.length;

    // Advance current note and time by the given subdivision...
    var secondsPerBeat = 60.0 /  song.meta.tempo;
    nextNoteTime      += ( 4 / subdivisions ) * secondsPerBeat; // Add beat length to last beat time

    // advance the beat number, wrap to zero when start of next bar is enqueued

    if ( ++currentSubdivision === subdivisions )
    {
        // advance the measure

        if ( ++currentMeasure > totalMeasures )
        {
            // last measure reached, jump back to first
            currentMeasure        = 1;
            firstMeasureStartTime = audioContext.currentTime;

            if ( recording )
            {
                // stop playing if we're recording and looping is disabled

                if ( !looping )
                {
                    SequencerController.setPlaying( false );
                    Pubsub.publish( Messages.RECORDING_COMPLETE );
                    return false;
                }
                else {
                    // TODO store all recorded notes so far (for continuous overdubs)
                }
            }
        }
        currentSubdivision = 0;

        if ( recording )
        {
            // one bar metronome count in ?

            if ( metronomeCountIn && !metronomeCountInComplete ) {

                metronome                = metronomeRestore;
                metronomeCountInComplete = true;

                currentMeasure        = 1;   // now we're actually starting!
                firstMeasureStartTime = audioContext.currentTime;
                recordedEvents        = [];
            }

            // replace the notes present in the newly reached measure in case replacement mode is active

            if ( replaceNotes )
                removeEventsInMeasure( recordedEvents, currentMeasure );
        }
        Pubsub.publish( Messages.PATTERN_SWITCH, song.patterns[ currentMeasure ]);
    }
    currentMeasureOffset = audioContext.currentTime - firstMeasureStartTime;
    return true;
}

/**
 * @private
 * @param {number} beatNumber
 * @param {number} time
 */
function scheduleNote( beatNumber, time )
{
    // add sequenced a note when it is its time (and we're not counting in!)

    var sequenceNotes = !( recording && metronomeCountIn && !metronomeCountInComplete );

    if ( sequenceNotes )
    {
        // TODO : cache active pattern
        var channels = tracker.activeSong.patterns[ currentMeasure - 1 ].channels;

        var i = channels.length, channel, j, event;

        while ( i-- )
        {
            channel = channels[ i ];
            j = channel.length;

            while ( j-- )
            {
                event = channel[ j ];

                if ( !event )
                    continue;

                // QQQQ
                event.length = 3;
                event.startMeasure = currentMeasure;
                event.startMeasureOffset = currentMeasureOffset;
                // E.O. QQQ
                if ( !event.playing &&
                      event.startMeasure === currentMeasure &&
                      currentMeasureOffset >= event.startMeasureOffset &&
                      currentMeasureOffset < ( event.startMeasureOffset + event.length ))
                {
                    // enqueue into AudioContext queue at the right time
                    enqueueEvent( event, time );
                }
            }
        }
    }
    
    if ( metronome ) // sound the metronome
    {
        var noteResolution = 2; // 0 == 16th, 1 == 8th, 2 == quarter note

        if (( noteResolution === 1 ) && ( beatNumber % ( subdivisions / 8 )))
            return; // we're not playing non-8th 16th notes

        if (( noteResolution == 2 ) && ( beatNumber % ( subdivisions / 4 ) ))
            return; // we're not playing non-quarter 8th notes

        var pitch = 220; // default note has low pitch, except for:

        if ( !( beatNumber % subdivisions ))
            pitch = 440; // beat 0 == medium pitch

        else if ( beatNumber % ( subdivisions / 4 ))
            pitch = 880; // quarter notes = high pitch

        audioController.soundPitch( pitch, time, .05 );
    }
}

/**
 * use a silent OscillatorNode as a strictly timed clock
 * for adding AudioEvents to output
 *
 * @private
 *
 * @param {Object} aEvent
 * @param {number} aTime AudioContext timestamp
 */
function enqueueEvent( aEvent, aTime )
{
    aEvent.playing = true; // lock it for querying during playback

    var clock = audioContext.createOscillator();

    clock.onended = function( e )
    {
        audioController.noteOn( aEvent, audioContext.currentTime );
        dequeueEvent( aEvent, audioContext.currentTime + aEvent.length );
        freeHandler( clock ); // clear reference to this timed event
    };

    // store reference to prevent garbage collection prior to executing callback !
    queueHandlers.push( clock );

    var noGain = AudioFactory.createGainNode( audioContext );
    clock.connect( noGain );
    noGain.gain.value = 0;
    noGain.connect( audioContext.destination );

    AudioFactory.startOscillation( clock, audioContext.currentTime );
    AudioFactory.stopOscillation ( clock, aTime );
}

/**
 * use a silent OscillatorNode as a strictly timed clock
 * for removing AudioEvents from the AudioRenderer queue
 *
 * @private
 *
 * @param {Object} aEvent
 * @param {number} aTime AudioContext timestamp
 */
function dequeueEvent( aEvent, aTime )
{
    var clock = audioContext.createOscillator();

    clock.onended = function( e )
    {
        aEvent.playing = false;
        audioController.noteOff( aEvent );
        freeHandler( clock ); // clear reference to this timed event
    };

    // store reference to clock (prevents garbage collection prior to callback execution!)
    queueHandlers.push( clock );

    var noGain = AudioFactory.createGainNode( audioContext );
    clock.connect( noGain );
    noGain.gain.value = 0;
    noGain.connect( audioContext.destination );

    AudioFactory.startOscillation( clock, audioContext.currentTime );
    AudioFactory.stopOscillation ( clock, aTime );
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
