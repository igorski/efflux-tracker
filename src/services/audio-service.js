/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
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
import Vue                        from "vue";
import Config                     from "@/config";
import ModuleFactory              from "@/model/factories/module-factory";
import { ACTION_NOTE_ON }         from "@/model/types/audio-event-def";
import { applyRouting }           from "./audio/module-router";
import { applyModuleParamChange } from "./audio/module-automation";
import { getFrequency }           from "./audio/pitch";
import { processVoices }          from "./audio/audio-util";
import ADSR                       from "./audio/adsr-module";

import {
    tuneToOscillator, tuneBufferPlayback, adjustEventWaveForms,
    adjustEventVolume, adjustEventTunings
} from "@/utils/instrument-util";
import { saveAsFile } from "@/utils/file-util";
import {
    init, startOscillation, stopOscillation, setValue,
    createGainNode, createStereoPanner, createPWM, createWaveTableFromGraph
} from "./audio/webaudio-helper";

/* private properties */

let store, state, audioContext, eventCallback, masterBus, eq, compressor, pool, UNIQUE_EVENT_ID = 0,
    playing = false, recordOutput = false, outputRecorderRef, recorder;

/**
 * list that will contain all modules
 * for each instantiated instrument
 *
 * @type {Array<INSTRUMENT_MODULES>}
 */
let instrumentModulesList;

/**
 * list that contains all event voices that are currently playing
 * [instrumentIndex][eventId][EVENT_VOICE]
 *
 * @type {Array<Object<number, EVENT_VOICE_LIST>>}
 */
let instrumentEventsList = [];

/**
 * Prepares the environment to create pools for oscillators, wave
 * tables and instruments.
 *
 * @param {AudioContext} audioContextInstance
 * @param {Object} waveTables
 * @param {Function=} optExternalEventCallback to invoke for EXTERNAL_EVENT automations
 */
export const prepareEnvironment = ( audioContextInstance, waveTables, optExternalEventCallback ) => {
    audioContext  = audioContextInstance;
    eventCallback = optExternalEventCallback;
    setupRouting();

    // initialize the WaveTable / AudioBuffer pool

    pool = {
        NOISE : audioContext.createBuffer( 1, audioContext.sampleRate / 10, audioContext.sampleRate ),
        CUSTOM: [] // content created and maintained by "cacheCustomTables()"
    };

    const noiseChannel = pool.NOISE.getChannelData( 0 );
    for ( let i = 0, l = noiseChannel.length; i < l; ++i )
      noiseChannel[ i ] = Math.random() * 2 - 1;

    // create periodic waves from the entries in the WaveTables definitions file

    Object.keys( waveTables ).forEach( waveIdentifier => {
        pool[ waveIdentifier] = audioContext.createPeriodicWave(
            new Float32Array( waveTables[ waveIdentifier ].real ),
            new Float32Array( waveTables[ waveIdentifier ].imag )
        );
    });
    instrumentEventsList = new Array( Config.INSTRUMENT_AMOUNT );
    for ( let i = 0; i < Config.INSTRUMENT_AMOUNT; ++i ) {
        instrumentEventsList[i] = {};
    }
    createModules();
    AudioService.initialized = true;
};

/**
 * halts all playing audio, flushes events and
 * resets unique event id counter when requested (e.g. when loading new song)
 */
export const reset = ( resetEventCounter = false ) => {
    instrumentEventsList.forEach(( eventList, instrumentIndex ) => {
        processVoices(Object.values( eventList ), ( voice, oscillatorIndex ) => {
            returnVoiceNodesToPoolOnPlaybackEnd( instrumentModulesList[ instrumentIndex ], oscillatorIndex, voice, instrumentIndex );
            stopOscillation( voice.generator, audioContext.currentTime );
        });
        instrumentEventsList[ instrumentIndex ] = {};
    });
    if ( resetEventCounter ) {
        UNIQUE_EVENT_ID = 0;
    }
};

export const togglePlayback = isPlaying => {
    playing = isPlaying;
    if ( playing ) {
        // in case we were recording, unset the state to store the buffer
        recordOutput = !recordOutput;
        AudioService.toggleRecordingState();
    } else {
        reset();
        if ( recordOutput && recorder ) {
            recorder.stop();
            recorder.export();
        }
    }
};

/**
 * cache the custom WaveTables that are available to the instruments
 *
 * @param {Array<INSTRUMENT>} instruments
 */
export const cacheCustomTables = instruments => {
    instruments.forEach(( instrument, instrumentIndex ) => {
        pool.CUSTOM[instrumentIndex] = new Array(instrument.oscillators.length);
        instrument.oscillators.forEach((oscillator, oscillatorIndex) => {
            if (oscillator.table) {
                pool.CUSTOM[instrumentIndex][oscillatorIndex] = createTableFromCustomGraph(
                 instrumentIndex, oscillatorIndex, oscillator.table
                );
            }
        });
    });
};

/**
 * apply the module settings described in the currently active
 * songs model onto the audio processing chain.
 *
 * @param {SONG} song
 * @param {boolean=} connectAnalysers whether to connect the analyser nodes to
 *                   each instrument channels output, allows for monitoring audio
 *                   levels at the expense of some computational overhead.
 */
export const applyModules = ( song, connectAnalysers = false ) => {
    // first check if one of the channels is configured to operate solo
    const hasSoloChannel = song.instruments.find( instrument => !!instrument.solo );
    song.instruments.forEach(( instrument, instrumentIndex ) => {
        const instrumentModules        = instrumentModulesList[ instrumentIndex ];
        const { muted, solo, panning } = instrument;

        instrumentModules.output.gain.value = muted || ( hasSoloChannel && !solo ) ? 0 : instrument.volume;
        if (instrumentModules.panner && typeof panning === "number") {
            instrumentModules.panner.pan.value = panning;
        }
        const analyser = instrumentModules.analyser;
        analyser.disconnect();

        const output = connectAnalysers ? analyser : masterBus;

        ModuleFactory.applyConfiguration( "filter",    instrumentModules, instrument.filter,    output );
        ModuleFactory.applyConfiguration( "delay",     instrumentModules, instrument.delay,     output );
        ModuleFactory.applyConfiguration( "eq",        instrumentModules, instrument.eq,        output );
        ModuleFactory.applyConfiguration( "overdrive", instrumentModules, instrument.overdrive, output );

        if ( connectAnalysers ) {
            analyser.connect( masterBus );
        }
    });
};

/**
 * synthesize the audio for given event at given startTime
 *
 * @param {AUDIO_EVENT} event
 * @param {INSTRUMENT} instrument to playback the event
 * @param {number=} startTimeInSeconds optional, defaults to current time
 */
export const noteOn = ( event, instrument, startTimeInSeconds = audioContext.currentTime ) => {
    if ( event.action === ACTION_NOTE_ON ) {

        // here we create a unique event identifier which is used to store a reference to the
        // event during its playback time.

        // however, first check if the event already has an id and is currently playing back
        // (the scenario here is a pattern jump / sequencer action retriggering an already
        // playing event, for instance: looping a single measure where a new "retrigger" of
        // the event should be played while the first one is still playing back its release tail).

        if ( event.id ) {

            // force noteOff on currently playing nodes (will go to release phase and
            // afterwards dispose of playing nodes).

            noteOff( event, startTimeInSeconds ); // will clear previously playing notes for event
            event.id = null;  // generates a new id below
        }
        if ( !event.id ) {
            Vue.set( event, "id", ( ++UNIQUE_EVENT_ID ));
        }

        // console.info(`NOTE ON for ${event.id} (${event.note}${event.octave}) @ ${startTimeInSeconds}s`);

        const frequency = getFrequency( event.note, event.octave );
        const voices    = /** @type {EVENT_VOICE_LIST} */ ([]);
        const modules   = instrumentModulesList[ instrument.index ];
        let voice;

        instrument.oscillators.forEach(( oscillatorVO, oscillatorIndex ) => {
            if ( !oscillatorVO.enabled ) {
                return;
            }
            voice = instrument.oscillators[ oscillatorIndex ];

            // retrieve from pool the envelope gain structure for the oscillator voice
            const oscillatorNodes = retrieveAvailableVoiceNodesFromPool( modules, oscillatorIndex );
            if (oscillatorNodes === null) {
                // console.warn(`no more nodes in the pool for oscillator ${oscillatorIndex} of instrument ${instrument.index}`);
                return;
            }
            const { oscillatorNode, adsrNode } = oscillatorNodes;
            let generatorNode;

            if (oscillatorVO.waveform === "NOISE") {
                // buffer source ? assign it to the oscillator
                generatorNode = audioContext.createBufferSource();
                generatorNode.buffer = pool.NOISE;
                generatorNode.loop = true;
                generatorNode.playbackRate.value = tuneBufferPlayback(voice);
            }
            else {
                // has oscillator source
                if (oscillatorVO.waveform === "PWM") {
                    // PWM uses a custom Oscillator type which connects its structure directly to the oscillatorNode
                    generatorNode = createPWM(
                        audioContext, startTimeInSeconds, startTimeInSeconds + 2, oscillatorNode
                    );
                }
                else {
                    // all other waveforms have WaveTables which are defined in the pools

                    generatorNode = audioContext.createOscillator();
                    let table;

                    if (oscillatorVO.waveform !== "CUSTOM")
                        table = pool[oscillatorVO.waveform];
                    else
                        table = pool.CUSTOM[ instrument.index ][ oscillatorIndex ];

                    if ( !table ) // no table ? that"s a bit of a problem. what did you break!?
                        return;

                    generatorNode.setPeriodicWave( table );
                }
                // tune event frequency to oscillator tuning and apply pitch envelopes
                generatorNode.frequency.value = tuneToOscillator(frequency, voice);
            }

            // apply envelopes

            setValue(oscillatorNode.gain, oscillatorVO.volume, audioContext);
            setValue(adsrNode.gain, 1, audioContext);

            ADSR.applyAmpEnvelope  (oscillatorVO, adsrNode,      startTimeInSeconds);
            ADSR.applyPitchEnvelope(oscillatorVO, generatorNode, startTimeInSeconds);

            // route oscillator to track gain > envelope gain > instrument gain

            if ( oscillatorVO.waveform !== "PWM" )
                generatorNode.connect(oscillatorNode);

            // start playback

            startOscillation(generatorNode, startTimeInSeconds);

            voices[oscillatorIndex] = /** @type {EVENT_VOICE} */ ({
                generator: generatorNode,
                vo: oscillatorVO,
                frequency: frequency,
                gain: oscillatorNode,
                outputNode: adsrNode,
                gliding: false
            });
        });
        instrumentEventsList[ instrument.index ][ event.id ] = voices;
    }
    // module parameter change specified ? process it.

    if (event.mp) {
        applyModuleParamChange(
            audioContext,
            event,
            instrumentModulesList[ instrument.index ],
            instrument,
            Object.values(instrumentEventsList[ instrument.index ]),
            startTimeInSeconds,
            masterBus,
            eventCallback
        );
    }
};

/**
 * immediately stop playing audio for the given event (or after a small
 * delay in case a positive release envelope is set)
 *
 * @param {AUDIO_EVENT} event
 * @param {number=} startTimeInSeconds optional time to start the noteOff,
 *                  this will default to the current time. This time should
 *                  equal the end of the note"s sustain period as release
 *                  will be applied automatically
 */
export const noteOff = ( event, startTimeInSeconds = audioContext.currentTime ) => {
    const eventId     = event.id, instrumentIndex = event.instrument;
    const eventVoices = instrumentEventsList[ instrumentIndex ][ eventId ];

    if ( !eventVoices ) return; // event has no reference to playing nodes

    // console.info(`NOTE OFF for ${event.id} ( ${event.note}${event.octave} @ ${startTimeInSeconds}s`);

    eventVoices.forEach(( voice, oscillatorIndex ) => {
        if ( !voice ) {
            return;
        }
        // apply release envelopes
        ADSR.applyAmpRelease  ( voice.vo, voice.outputNode, startTimeInSeconds );
        ADSR.applyPitchRelease( voice.vo, voice.generator,  startTimeInSeconds );

        returnVoiceNodesToPoolOnPlaybackEnd( instrumentModulesList[ instrumentIndex ], oscillatorIndex, voice, instrumentIndex, eventId );
        stopOscillation( voice.generator, startTimeInSeconds + voice.vo.adsr.release );
    });
};

/**
 * retrieve a reference to the applications AudioContext
 *
 * @return {AudioContext}
 */
export const getAudioContext = () => audioContext;

export const isRecording = () => recordOutput;

const AudioService =
{
    initialized: false,
    reset,
    cacheCustomTables,
    applyModules,
    getAudioContext,
    isRecording,
    noteOn,
    noteOff,

    /**
     * query whether we can actually use the WebAudio API in
     * the current application environment
     *
     * @return {boolean}
     */
    isSupported() {
        return ( typeof AudioContext !== "undefined" ||
                 typeof webkitAudioContext !== "undefined" );
    },
    /**
     * initializes the audioContext so we can
     * synthesize audio using the WebAudio API
     *
     * @param {Object} storeReference the root Vuex store
     * @param {!Function} outputRecorderReference reference to the output recorder class
     *                    (should only be passed in case output recording is supported)
     * @param {Object} waveTables list of available wave tables
     */
    async init( storeReference, outputRecorderReference, waveTables ) {
        store = storeReference;
        state = store.state;

        outputRecorderRef = outputRecorderReference;

        // NOTE: the audioContext is generated asynchronously after a user interaction
        // (e.g. click/touch/keydown anywhere in the document) as browsers otherwise prevent audio playback

        audioContext = await init();
        prepareEnvironment( audioContext, waveTables );

        AudioService.cacheCustomTables( state.song.activeSong.instruments );
    },
    toggleRecordingState() {
        recordOutput = !recordOutput;
        if ( recordOutput && outputRecorderRef ) {
            if ( !recorder) {
                recorder = new ( outputRecorderRef )( compressor, {
                    callback : handleRecordingComplete
                });
            }
            if ( playing ) {
                recorder.record();
            }
        } else if ( recorder ) {
            recorder.stop();
            recorder.export();
        }
    },
    cacheAllOscillators(instrumentIndex, instrument) {
        instrument.oscillators.forEach((oscillator, oscillatorIndex) => {
            AudioService.updateOscillator("waveform", instrumentIndex, oscillatorIndex, oscillator )
        });
    },
    updateOscillator(property, instrumentIndex, oscillatorIndex, oscillator) {
        if (!/waveform|tuning|volume/.test(property))
            throw new Error(`cannot update unsupported oscillator property ${property}`);

        const events = Object.values(instrumentEventsList[instrumentIndex]);
        switch (property) {
            case "waveform":
                if ( oscillator.enabled && oscillator.waveform === "CUSTOM" ) {
                    adjustEventWaveForms(events, oscillatorIndex,
                        createTableFromCustomGraph(instrumentIndex, oscillatorIndex, oscillator.table)
                    );
                }
                else {
                    adjustEventWaveForms(events, oscillatorIndex, pool[oscillator.waveform] );
                }
                break;
            case "volume":
                adjustEventVolume(events, oscillatorIndex, oscillator);
                break;
            case "tuning":
                adjustEventTunings(events, oscillatorIndex, oscillator);
                break;
        }
    },
    adjustInstrumentVolume(instrumentIndex, volume) {
        instrumentModulesList[instrumentIndex].output.gain.value = volume;
    },
    adjustInstrumentPanning(instrumentIndex, pan) {
        instrumentModulesList[instrumentIndex].panner.pan.value = pan;
    }
};
export default AudioService;

export const getAnalysers = () => {
    return ( Array.isArray(instrumentModulesList) ? instrumentModulesList : [] )
                .map(modules => modules.analyser);
};

export const applyModule = ( type, instrumentIndex, props ) => {
    ModuleFactory.applyConfiguration( type, instrumentModulesList[ instrumentIndex ], props, masterBus );
};
/* internal methods */

function setupRouting() {
    masterBus  = createGainNode( audioContext );
    eq         = audioContext.createBiquadFilter();
    eq.type    = "highpass";
    eq.frequency.value = 30; // remove sub-30 Hz rumbling
    compressor = audioContext.createDynamicsCompressor();
    masterBus.connect( eq );
    eq.connect( compressor );
    compressor.connect( audioContext.destination );
}

function createModules() {
    // create new modules for each possible instrument
    instrumentModulesList = new Array(Config.INSTRUMENT_AMOUNT);

    for (let i = 0; i < instrumentModulesList.length; ++i ) {
        const instrumentModules = instrumentModulesList[i] = {
            panner    : createStereoPanner(audioContext),
            overdrive : ModuleFactory.createOverdrive(audioContext),
            eq        : ModuleFactory.createEQ(audioContext),
            filter    : ModuleFactory.createFilter(audioContext),
            delay     : ModuleFactory.createDelay(audioContext),
            analyser  : audioContext.createAnalyser(),
            voices    : new Array(Config.OSCILLATOR_AMOUNT),
            output    : createGainNode(audioContext)
        };
        // max polyphony is 3 oscillators per channel
        for (let j = 0; j < Config.OSCILLATOR_AMOUNT; ++j) {
            instrumentModules.voices[j] = [];
            // the channel amount can equal the total amount of instruments as in Efflux, each instrument gets a
            // channel strip in the tracker and each channel can override its target instrument (thus 24 simultaneous
            // voices per instrument can be used) we then multiply this as creative usages (black midi??) can
            // allow multiple channels to target the same voice at fast repeating (yet sustaining) intervals
            const mult = 2;
            for (let k = 0; k < Config.INSTRUMENT_AMOUNT * mult; ++k) {
                const nodes = {
                    oscillatorNode: createGainNode(audioContext),
                    adsrNode: createGainNode(audioContext)
                };
                nodes.oscillatorNode.connect(nodes.adsrNode);
                nodes.adsrNode.connect(instrumentModules.output);
                instrumentModules.voices[j].push(nodes);
            }
        }
        applyRouting(instrumentModules, masterBus);
    }
}

function retrieveAvailableVoiceNodesFromPool(instrumentModules, oscillatorIndex) {
    const availableVoices = instrumentModules.voices[oscillatorIndex];
    if (availableVoices.length) {
        return availableVoices.shift();
    }
    return null;
}

function returnVoiceNodesToPoolOnPlaybackEnd( instrumentModules, oscillatorIndex, voice, instrumentIndex, eventId = null ) {
    voice.generator.onended = () => {
        // OscillatorNodes will automatically disconnect() after stopping
        // except for PWM which has a custom implementation
        voice.generator.disconnect();

        // delete the associated event from the playback list
        // we delay this until the voices have actually halted playback
        // as otherwise the voices aren"t always returned to the pool on Safari/iOS

        if (eventId !== null) {
            delete instrumentEventsList[ instrumentIndex ][ eventId ];
        }

        // return the gain nodes for the instrument voice back to the pool
        instrumentModules.voices[ oscillatorIndex ].push({
            oscillatorNode: voice.gain,
            adsrNode: voice.outputNode
        });
    };
}

/**
 * create a periodicWaveTable (which can be used with a OscillatorNode for playback)
 * from an Array of custom drawn points
 *
 * @param {number} instrumentIndex index of the instrument within the pool
 * @param {number} oscillatorIndex index of the oscillator within the instrument
 * @param {Array<number>} table list of points
 * @return {PeriodicWave} the created WaveTable
 */
function createTableFromCustomGraph( instrumentIndex, oscillatorIndex, table ) {
    return pool.CUSTOM[ instrumentIndex ][ oscillatorIndex ] = createWaveTableFromGraph( audioContext, table );
}

function handleRecordingComplete( blob ) {
    const blobUrl = window.URL.createObjectURL( blob );
    saveAsFile( blobUrl, "efflux-output.wav" );
    window.URL.revokeObjectURL( blobUrl );

    // free recorder resources

    recorder.dispose();
    recorder = null;
    recordOutput = false;

    store.commit( "showNotification", { message: store.getters.t( "messages.recordingSaved" ) });
}
