/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2019 - https://www.igorski.nl
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
import Config from '../../config';
import LinkedList from '../../utils/LinkedList';
import Metronome from '../../utils/Metronome';

/* internal methods */

// TODO: move these to a dedicated helper

/**
 * @param {Object} state
 * @param {AUDIO_EVENT} aEvent
 * @param {number} aEventChannel channel the event belongs to
 */
function enqueueEvent(state, aEvent, aEventChannel ) {
    const { beatAmount, nextNoteTime, currentMeasure } = state;
    aEvent.seq.playing = true; // lock the Event for further querying during its playback

    // calculate the total duration for the event

    const patternDuration = ( 60 / efflux.activeSong.meta.tempo ) * beatAmount;
    const patterns        = efflux.activeSong.patterns;
    const eventPattern    = patterns[ currentMeasure ];

    if ( eventPattern )
        aEvent.seq.mpLength = patternDuration / eventPattern.steps;

    // play back the event in the AudioController

    audioController.noteOn( aEvent, efflux.activeSong.instruments[ aEvent.instrument ], nextNoteTime );

    // events must also be dequeued (as they have a fixed duration)

    const isNoteOn = ( aEvent.action === 1 );
    const queue    = state.channelQueue[ aEventChannel ];

    if ( aEvent.action !== 0 ) {

        // all non-module parameter change events kill previously playing notes
        let playing = queue.head;

        while ( playing ) {
            dequeueEvent( state, playing.data, nextNoteTime );
            playing.remove();
            playing = queue.head;
        }
    }

    // non-noteOn events are dequeued after a single sequencer tick, noteOn
    // events are pushed in a queued and dequeued when a new noteOn/noteOff event
    // is enqueued for this events channel

    if ( !isNoteOn )
        dequeueEvent( state, aEvent, aTime + aEvent.seq.mpLength );
    else
        queue.add( aEvent );
}

/**
 * use a silent OscillatorNode as a strictly timed clock
 * for removing the AudioEvents from the AudioController
 *
 * @param {Object} state
 * @param {AUDIO_EVENT} aEvent
 * @param {number} aTime
 */
function dequeueEvent( state, aEvent, aTime ) {
    if ( !aEvent.seq.playing )
        return;

    const clock = AudioUtil.createTimer( audioContext, aTime, ( aTimerEvent ) => {
        aEvent.seq.playing = false;
        audioController.noteOff( aEvent, efflux.activeSong.instruments[ aEvent.instrument ]);
        freeHandler(state, clock ); // clear reference to this timed event
    });

    // store reference to prevent garbage collection prior to callback execution !
    state.queueHandlers.push( clock );
}

function clearPending(state) {
    SongUtil.resetPlayState( efflux.activeSong.patterns ); // unset playing state of existing events

    let i = state.queueHandlers.length;
    while ( i-- )
        freeHandler(state, state.queueHandlers[ i ]);

    for ( i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
        state.channelQueue[ i ].flush();
}

/**
 * free reference to given "clock" (makes it
 * eligible for garbage collection)
 *
 * @param {Object} state
 * @param {OscillatorNode} aNode
 */
function freeHandler( state, aNode ) {
    aNode.disconnect();
    aNode.onended = null;

    const i = state.queueHandlers.indexOf( aNode );
    if ( i !== -1 )
        state.queueHandlers.splice( i, 1 );
}

function collect(state) {
    // adapted from http://www.html5rocks.com/en/tutorials/audio/scheduling/
    const sequenceEvents = !( state.recording && state.metronome.countIn && !state.metronome.countInComplete );
    let i, j, channel, event, compareTime;

    while ( state.nextNoteTime < ( audioContext.currentTime + state.scheduleAheadTime ))
    {
        if ( sequenceEvents )
        {
            compareTime = ( state.nextNoteTime - state.measureStartTime );
            i = channels.length;

            while ( i-- )
            {
                channel = channels[ i ];
                j = channel.length;

                while ( j-- )
                {
                    event = channel[ j ];

                    if ( event && !event.seq.playing && !event.recording &&
                         event.seq.startMeasure === state.currentMeasure &&
                         compareTime >= event.seq.startMeasureOffset &&
                         compareTime < ( event.seq.startMeasureOffset + event.seq.length ))
                    {
                        // enqueue into AudioContext queue at the right time
                        enqueueEvent( state, event, i );
                    }
                }
            }
        }
        if ( state.metronome.enabled ) // sound the metronome
            state.metronome.play( 2, state.currentStep, state.stepPrecision, state.nextNoteTime, audioContext );

        // advance to next step position
        step(state);
    }
}

/**
 * advances the currently active step of the pattern
 * onto the next, when the end of pattern has been reached, the
 * pattern will either loop or we the Sequencer will progress onto the next pattern
 */
function step(state) {
    const song          = efflux.activeSong;
    const totalMeasures = song.patterns.length;

    // Advance current note and time by the given subdivision...
    state.nextNoteTime += (( 60 / song.meta.tempo ) * 4 ) / state.stepPrecision;

    // advance the beat number, wrap to zero when start of next bar is enqueued

    if ( ++state.currentStep === state.stepPrecision ) {
        state.currentStep = 0;

        // advance the measure if the Sequencer wasn't looping

        if ( !state.looping && ++state.currentMeasure === totalMeasures ) {
            // last measure reached, jump back to first
            state.currentMeasure = 0;

            // stop playing if we're recording and looping is disabled

            if ( state.recording && !efflux.EditorModel.loopedRecording ) {
                SequencerController.setPlaying( false );
               // Pubsub.publishSync( Messages.RECORDING_COMPLETE );
                return;
            }
        }
        SequencerController.setPosition( state.currentMeasure, state.nextNoteTime );

        if ( state.recording )
        {
            // one bar metronome count in ?

            if ( state.metronome.countIn && !state.metronome.countInComplete ) {

                state.metronome.enabled         = state.metronome.restore;
                state.metronome.countInComplete = true;

                state.currentMeasure        = 0;   // now we're actually starting!
                state.firstMeasureStartTime = audioContext.currentTime;
            }
        }
        switchPattern( currentMeasure );
    }
   // Pubsub.publishSync( Messages.STEP_POSITION_REACHED, [ state.currentStep, state.stepPrecision ]);
}

/* store */

export default {
    state: {
        playing               : false,
        looping               : false,
        recording             : false,
        scheduleAheadTime     : 0.2,
        stepPrecision         : 64,
        beatAmount            : 4, // beat amount (the "3" in 3/4) and beat unit (the "4" in 3/4) describe the time signature
        beatUnit              : 4,
        queueHandlers         : [],
        channelQueue          : new Array( Config.INSTRUMENT_AMOUNT ),
        currentMeasure        : 0,
        measureStartTime      : 0,
        firstMeasureStartTime : 0,
        currentStep           : 0,
        nextNoteTime          : 0,
        channels              : 0,
        worker                : null,
        metronome             : Metronome
    },
    getters: {
        isPlaying(state) {
            return state.playing;
        },
        isLooping(state) {
            return state.looping;
        },
        isRecording(state) {
            return state.recording;
        },
        isMetronomeEnabled(state) {
            return state.metronome.enabled;
        },
        position: state => ({ measure: state.currentMeasure, step: state.currentStep })
    },
    mutations: {
        setPlaying(state, isPlaying) {
            state.playing = !!isPlaying;

            if (state.playing) {
                if ( state.recording && state.metronome.countIn ) {
                    state.metronome.countInComplete = false;
                    state.metronome.enabled         = true;
                }
                state.currentStep = 0;  // always start from beginning
                state.worker.postMessage({ "cmd" : "start" });
                //Pubsub.publishSync( Messages.PLAYBACK_STARTED );
            } else {
                state.worker.postMessage({ "cmd" : "stop" });
                //Pubsub.publishSync( Messages.PLAYBACK_STOPPED );
            }
        },
        setLooping(state, isLooping) {
            state.looping = !!isLooping;
        },
        setRecording(state, isRecording) {
            state.recording = !!isRecording;
        },
        setCurrentStep(state, step) {
            state.currentStep = step;
        },
        setCurrentMeasure(state, measure) {
            state.currentMeasure = measure;
        },
        /**
         * set the sequencers position
         *
         * @param {Object} state
         * @param {Object} activeSong
         * @param {number} measure
         * @param {number=} currentTime optional time to sync given measure to
         *        this will default to the currentTime of the AudioContext for instant enqueuing
         */
        setPosition(state, { activeSong, measure, currentTime }) {
            if ( measure >= activeSong.patterns.length )
                measure = activeSong.patterns.length - 1;

            if ( state.currentMeasure !== measure )
                state.currentStep = 0;
            // TODO: get audioContext??
            if ( typeof currentTime !== "number" )
                currentTime = audioContext ? audioContext.currentTime : 0;

            state.currentMeasure        = measure;
            state.nextNoteTime          = currentTime;
            state.measureStartTime      = currentTime;
            state.firstMeasureStartTime = currentTime - ( measure * ( 60.0 / activeSong.meta.tempo * state.beatAmount ));

            state.channels = activeSong.patterns[ state.currentMeasure ].channels;

            // when going to the first measure we should stop playing all currently sounding notes

            if ( state.currentMeasure === 0 ) {
                state.channelQueue.forEach(list => {
                    let q = list.head;
                    while ( q ) {
                        dequeueEvent(state, q.data, currentTime );
                        q.remove();
                        q = list.head;
                    }
                });
            }
        },
        setMetronomeEnabled(state, enabled) {
            state.metronome.enabled = !!enabled;
        }
    },
    actions: {
        prepareSequencer({ state }) {
            // create LinkedLists to store all currently playing events for all channels

            for ( let i = 0; i < state.channelQueue.length; ++i ) {
                state.channelQueue[ i ] = new LinkedList();
            }

            // spawn Worker to handle the intervallic polling
            state.worker = new Worker( '../../workers/SequencerWorker.js' );
            state.worker.onmessage = msg => {
                if ( msg.data.cmd === "collect" && state.isPlaying )
                    collect(state);
            };
        }
    }
};
