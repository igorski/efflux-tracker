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
import Vue from 'vue';
import Config from '../../config';
import LinkedList from '../../utils/linked-list';
import Metronome from '../../utils/metronome-util';
import AudioUtil from '../../utils/audio-util';
import AudioService from '../../services/audio-service';
import SequencerWorker from '../../workers/sequencer-worker.js';

/* internal methods */

// TODO: move these to a dedicated helper

/**
 * @param {Object} store root Vuex store
 * @param {AUDIO_EVENT} event
 * @param {number} eventChannel channel the event belongs to
 */
function enqueueEvent(store, event, eventChannel ) {
    const { beatAmount, nextNoteTime, activePattern, channelQueue } = store.state.sequencer;
    const activeSong = store.state.song.activeSong;

    event.seq.playing = true; // lock the Event for further querying during its playback

    // calculate the total duration for the event

    const patternDuration = ( 60 / activeSong.meta.tempo ) * beatAmount;
    const patterns        = activeSong.patterns;
    const eventPattern    = patterns[ activePattern ];

    if ( eventPattern )
        event.seq.mpLength = patternDuration / eventPattern.steps;

    // play back the event in the AudioService

    AudioService.noteOn( event, activeSong.instruments[ event.instrument ], nextNoteTime );

    // events must also be dequeued (as they have a fixed duration)

    const isNoteOn = ( event.action === 1 );
    const queue    = channelQueue[ eventChannel ];

    if ( event.action !== 0 ) {

        // all non-module parameter change events kill previously playing notes
        let playing = queue.head;

        while ( playing ) {
            dequeueEvent(store.state.sequencer, playing.data, nextNoteTime);
            playing.remove();
            playing = queue.head;
        }
    }

    // non-noteOn events are dequeued after a single sequencer tick, noteOn
    // events are pushed in a queued and dequeued when a new noteOn/noteOff event
    // is enqueued for this events channel

    if ( !isNoteOn )
        dequeueEvent(store.state.sequencer, event, nextNoteTime + event.seq.mpLength);
    else
        queue.add(event);
}

/**
 * use a silent OscillatorNode as a strictly timed clock
 * for removing the AudioEvents from the AudioService
 *
 * @param {Object} state sequencer Vuex module state
 * @param {AUDIO_EVENT} event
 * @param {number} time
 */
function dequeueEvent(state, event, time ) {
    if (!event.seq.playing)
        return;

    const clock = AudioUtil.createTimer( AudioService.getAudioContext(), time, () => {
        event.seq.playing = false;
        AudioService.noteOff(event);
        freeHandler(state, clock ); // clear reference to this timed event
    });

    // store reference to prevent garbage collection prior to callback execution !
    state.queueHandlers.push( clock );
}

/**
 * free reference to given "clock" (makes it
 * eligible for garbage collection)
 *
 * @param {Object} state sequencer Vuex module state
 * @param {OscillatorNode} node
 */
function freeHandler(state, node) {
    node.disconnect();
    node.onended = null;

    const i = state.queueHandlers.indexOf(node);
    if ( i !== -1 )
        state.queueHandlers.splice(i, 1);
}

function collect(store) {
    const state = store.state.sequencer;

    // adapted from http://www.html5rocks.com/en/tutorials/audio/scheduling/
    const sequenceEvents = !( state.recording && state.metronome.countIn && !state.metronome.countInComplete );
    let i, j, channel, event, compareTime;

    while ( state.nextNoteTime < ( AudioService.getAudioContext().currentTime + state.scheduleAheadTime ))
    {
        if ( sequenceEvents )
        {
            compareTime = ( state.nextNoteTime - state.measureStartTime );
            i = state.channels.length;

            while ( i-- )
            {
                channel = state.channels[ i ];
                j = channel.length;

                while ( j-- )
                {
                    event = channel[ j ];

                    if ( event && !event.seq.playing && !event.recording &&
                         event.seq.startMeasure === state.activePattern &&
                         compareTime >= event.seq.startMeasureOffset &&
                         compareTime < ( event.seq.startMeasureOffset + event.seq.length ))
                    {
                        // enqueue into AudioContext queue at the right time
                        enqueueEvent( store, event, i );
                    }
                }
            }
        }
        if ( state.metronome.enabled ) // sound the metronome
            state.metronome.play( 2, state.currentStep, state.stepPrecision, state.nextNoteTime, AudioService.getAudioContext() );

        // advance to next step position
        step(store);
    }
}

/**
 * advances the currently active step of the pattern
 * onto the next, when the end of pattern has been reached, the
 * pattern will either loop or we the Sequencer will progress onto the next pattern
 */
function step(store) {
    const activeSong    = store.state.song.activeSong;
    const totalMeasures = activeSong.patterns.length;
    const state         = store.state.sequencer;

    // Advance current note and time by the given subdivision...
    state.nextNoteTime += (( 60 / activeSong.meta.tempo ) * 4 ) / state.stepPrecision;

    // advance the beat number, wrap to zero when start of next bar is enqueued

    const currentStep = state.currentStep + 1;
    store.commit('setCurrentStep', currentStep);

    if (currentStep === state.stepPrecision) {
        store.commit('setCurrentStep', 0);

        // advance the measure if the Sequencer wasn't looping

        if (!state.looping)
            store.commit('gotoNextPattern', activeSong);

        if (state.activePattern === totalMeasures) {
            // last measure reached, jump back to first
            store.commit('setActivePattern', 0);

            // stop playing if we're recording and looping is disabled

            if ( state.recording && !state.editor.loopedRecording ) {
                store.commit('setPlaying', false );
               // Pubsub.publishSync( Messages.RECORDING_COMPLETE );
                return;
            }
        }
        store.commit('setPosition', { activeSong, pattern: state.activePattern, currentTime: state.nextNoteTime });

        if ( state.recording )
        {
            // one bar metronome count in ?

            if ( state.metronome.countIn && !state.metronome.countInComplete ) {

                state.metronome.enabled         = state.metronome.restore;
                state.metronome.countInComplete = true;
                state.firstMeasureStartTime = AudioService.getAudioContext().currentTime;

                store.commit('setActivePattern', 0);
            }
        }
        store.commit('setActivePattern', state.activePattern );
    }
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
        activePattern         : 0,
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
        amountOfSteps(state, rootState) {
            return rootState.activeSong.patterns[state.activePattern].steps;
        },
        position: state => ({ pattern: state.activePattern, step: state.currentStep })
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
                state.worker.postMessage({ 'cmd' : 'start' });
            } else {
                state.worker.postMessage({ 'cmd' : 'stop' });
                let i = state.queueHandlers.length;
                while ( i-- )
                    freeHandler(state, state.queueHandlers[ i ]);

                for ( i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
                    state.channelQueue[i].flush();
            }
        },
        setLooping(state, isLooping) {
            state.looping = !!isLooping;
        },
        setRecording(state, isRecording) {
            state.recording = !!isRecording;
        },
        setActivePattern(state, value) {
            state.activePattern = value;
        },
        gotoPreviousPattern(state) {
            if (state.activePattern > 0)
                state.activePattern = state.activePattern - 1;
        },
        gotoNextPattern(state, activeSong) {
            const max = activeSong.patterns.length - 1;

            if ( state.activePattern <= max )
                state.activePattern = state.activePattern + 1;
        },
        setCurrentStep(state, step) {
            state.currentStep = step;
        },
        setPatternSteps(state, { pattern, steps }) {
            const oldAmount = pattern.steps;
            pattern.channels.forEach(( channel, index ) => {
                const transformed = new Array(steps);
                let i, j, increment;

                // ensure that the Array contains non-empty values
                for ( i = 0; i < steps; ++i ) {
                    transformed[ i ] = 0;
                }

                if ( steps < oldAmount )
                {
                    // reducing resolution, e.g. changing from 32 to 16 steps
                    increment = oldAmount / steps;

                    for ( i = 0, j = 0; i < steps; ++i, j += increment )
                       transformed[ i ] = channel[ j ];
                }
                else {
                    // increasing resolution, e.g. changing from 16 to 32 steps
                    increment = steps / oldAmount;

                    for ( i = 0, j = 0; i < oldAmount; ++i, j += increment )
                       transformed[ j ] = channel[ i ];
                }
                Vue.set(pattern.channels, index, transformed);
                Vue.set(pattern, 'steps', steps);
            });
        },
        /**
         * set the sequencers position to given target pattern and optional offset defined by currentTime
         *
         * @param {Object} state
         * @param {Object} activeSong
         * @param {number} pattern
         * @param {number=} currentTime optional time to sync given pattern to
         *        this will default to the currentTime of the AudioContext for instant enqueuing
         */
        setPosition(state, { activeSong, pattern, currentTime }) {
            if ( pattern >= activeSong.patterns.length )
                pattern = activeSong.patterns.length - 1;

            if ( state.activePattern !== pattern )
                state.currentStep = 0;

            if ( typeof currentTime !== 'number' )
                currentTime = AudioService.getAudioContext() ? AudioService.getAudioContext().currentTime : 0;

            state.activePattern         = pattern;
            state.nextNoteTime          = currentTime;
            state.measureStartTime      = currentTime;
            state.firstMeasureStartTime = currentTime - ( pattern * ( 60.0 / activeSong.meta.tempo * state.beatAmount ));

            state.channels = activeSong.patterns[ state.activePattern ].channels;

            // when going to the first measure we should stop playing all currently sounding notes

            if ( state.activePattern === 0 ) {
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
        prepareSequencer({ state }, rootStore) {
            return new Promise(resolve => {
                // create LinkedLists to store all currently playing events for all channels

                for ( let i = 0; i < state.channelQueue.length; ++i ) {
                    state.channelQueue[ i ] = new LinkedList();
                }

                // spawn Worker to handle the intervallic polling
                state.worker = new SequencerWorker();
                state.worker.onmessage = ({ data }) => {
                    if ( data.cmd === 'collect' && state.playing )
                        collect(rootStore);
                };
                resolve();
            });
        }
    }
};
