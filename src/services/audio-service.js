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
import Vue            from 'vue';
import AudioFactory   from '../model/factory/audio-factory';
import ModuleFactory  from '../model/factory/module-factory';
import AudioUtil      from '../utils/audio-util';
import RecordingUtil  from '../utils/audio-recording-util';
import ModuleUtil     from '../utils/module-util';
import InstrumentUtil from '../utils/instrument-util';
import Config         from '../config';
import Pitch          from '../definitions/Pitch';
import WaveTables     from '../definitions/WaveTables';
import ADSR           from '../model/modules/ADSR';

/* private properties */

let store, state, audioContext, masterBus, eq, compressor, pool, UNIQUE_EVENT_ID = 0,
    playing = false, recordOutput = false, recorder;

/**
 * list that will contain all modules
 * for each instantiated instrument
 *
 * @type {Array.<INSTRUMENT_MODULES>}
 */
let instrumentModules;

/**
 * list that will contain all EVENT_OBJECTs
 * playing back for any of the Songs instruments
 *
 * @type {Array.<Array.<EVENT_OBJECT>>}
 */
let instrumentEvents = [];

const AudioService =
{
    initialized: false,

    /**
     * query whether we can actually use the WebAudio API in
     * the current application environment
     *
     * @return {boolean}
     */
    isSupported() {
        return ( typeof AudioContext !== 'undefined' ||
                 typeof webkitAudioContext !== 'undefined' );
    },
    /**
     * initializes the audioContext so we can
     * synthesize audio using the WebAudio API
     *
     * @param {Object} storeReference the root Vuex store
     * @return Promise
     */
    init(storeReference) {
        store = storeReference;
        state = store.state;

        // NOTE: the audioContext is generated asynchronously after a user interaction
        // (e.g. click/touch/keydown anywhere in the document) as browsers otherwise prevent audio playback

        return new Promise(resolve => {
            AudioUtil.init(( generatedContext ) => {
                audioContext = generatedContext;
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

                Object.keys(WaveTables).forEach(waveIdentifier => {
                    pool[ waveIdentifier ] = audioContext.createPeriodicWave(
                        new Float32Array( WaveTables[ waveIdentifier ].real ),
                        new Float32Array( WaveTables[ waveIdentifier ].imag )
                    );
                });
                AudioService.reset();
                AudioService.cacheCustomTables(state.song.activeSong.instruments);
                AudioService.initialized = true;

                resolve(audioContext);
            });
        });
    },
    /**
     * retrieve a reference to the applications AudioContext
     *
     * @return {AudioContext}
     */
    getAudioContext() {
        return audioContext;
    },
    /**
     * cache the custom WaveTables that are available to the instruments
     *
     * @param {Array.<INSTRUMENT>} instruments
     */
    cacheCustomTables(instruments) {
        instruments.forEach(( instrument, instrumentIndex ) => {
            pool.CUSTOM[ instrumentIndex ] = new Array( instrument.oscillators.length );
            instrument.oscillators.forEach(( oscillator, oscillatorIndex ) => {
                if ( oscillator.table ) {
                    pool.CUSTOM[ instrumentIndex ][ oscillatorIndex ] = createTableFromCustomGraph(
                     instrumentIndex, oscillatorIndex, oscillator.table
                    );
                }
            });
        });
    },
    togglePlayback(isPlaying, song) {
        playing = isPlaying;
        if (playing) {
            AudioService.applyModules(song);
            // in case we were recording, unset the state to store the buffer
            recordOutput = !recordOutput;
            AudioService.toggleRecordingState();
        } else {
            AudioService.reset();
            if (recordOutput && recorder) {
                recorder.stop();
                recorder.exportWAV();
            }
        }
    },
    /**
     * halts all playing audio, flushes events and
     * resets unique event id counter
     */
    reset() {
        instrumentEvents.forEach(events => {
            let i = events.length, event;

            while ( i-- ) {
                event = /** @type {EVENT_OBJECT} */ ( events[ i ] );

                if ( event ) {
                    event.forEach(voice => AudioFactory.stopOscillation(voice.generator));
                }
            }
        });
        instrumentEvents = new Array( Config.INSTRUMENT_AMOUNT );
        for ( let i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
            instrumentEvents[ i ] = [];

        createModules();

        UNIQUE_EVENT_ID = 0;
    },
    toggleRecordingState() {
        recordOutput = !recordOutput;
        if (recordOutput) {
            if (!recorder) {
                recorder = new RecordingUtil(masterBus, {
                    callback : handleRecordingComplete
                });
            }
            if (playing)
                recorder.record();
        } else if (recorder) {
            recorder.stop();
            recorder.exportWAV();
        }
    },
    /**
     * synthesize the audio for given event at given startTime
     *
     * @param {AUDIO_EVENT} event
     * @param {INSTRUMENT} instrument to playback the event
     * @param {number=} startTimeInSeconds optional, defaults to current time
     */
    noteOn( event, instrument, startTimeInSeconds ) {
        if ( event.action === 1 ) { // 1 == noteOn
            Vue.set(event, 'id', ++UNIQUE_EVENT_ID); // create unique event identifier

            //console.log(`NOTE ON FOR ${event.id} (${event.note}${event.octave}) @ ${audioContext.currentTime}`);

            const frequency = Pitch.getFrequency( event.note, event.octave );

            if ( typeof startTimeInSeconds !== 'number' )
                startTimeInSeconds = audioContext.currentTime;

            let oscillators = /** @type {EVENT_OBJECT} */ ( [] ), voice;
            const modules   = instrumentModules[ instrument.id ];

            instrument.oscillators.forEach(( oscillatorVO, oscillatorIndex ) => {
                if ( oscillatorVO.enabled ) {

                    voice = instrument.oscillators[ oscillatorIndex ];
                    const oscillatorGain = AudioFactory.createGainNode( audioContext );
                    let generatorNode;

                    // buffer source ? assign it to the oscillator

                    if ( oscillatorVO.waveform === 'NOISE' ) {

                        generatorNode = audioContext.createBufferSource();
                        generatorNode.buffer = pool.NOISE;
                        generatorNode.loop = true;
                        generatorNode.playbackRate.value = InstrumentUtil.tuneBufferPlayback( voice );
                    }
                    else {

                        // has oscillator source

                        if ( oscillatorVO.waveform === 'PWM' ) {
                            // PWM uses a custom Oscillator type
                            generatorNode = AudioFactory.createPWM(
                                audioContext, startTimeInSeconds, startTimeInSeconds + 2, oscillatorGain
                            );
                        }
                        else {
                            // all other waveforms have WaveTables which are defined in the pools

                            generatorNode = audioContext.createOscillator();
                            let table;

                            if ( oscillatorVO.waveform !== 'CUSTOM' )
                                table = pool[ oscillatorVO.waveform ];
                            else
                                table = pool.CUSTOM[ instrument.id ][ oscillatorIndex ];

                            if ( !table ) // no table ? that's a bit of a problem. what did you break!?
                                return;

                            generatorNode.setPeriodicWave( table );
                        }
                        // tune event frequency to oscillator tuning and apply pitch envelopes
                        generatorNode.frequency.value = InstrumentUtil.tuneToOscillator( frequency, voice );
                    }

                    // apply envelopes

                    const adsrNode = AudioFactory.createGainNode( audioContext );
                    ADSR.applyAmpEnvelope  ( oscillatorVO, adsrNode, startTimeInSeconds );
                    ADSR.applyPitchEnvelope( oscillatorVO, generatorNode, startTimeInSeconds );

                    // route oscillator to track gain > envelope gain > instrument gain

                    oscillatorGain.gain.value = oscillatorVO.volume;

                    if ( oscillatorVO.waveform !== 'PWM' )
                        generatorNode.connect( oscillatorGain );

                    oscillatorGain.connect( adsrNode );
                    adsrNode.connect( modules.output );

                    // start playback

                    AudioFactory.startOscillation( generatorNode, startTimeInSeconds );

                    oscillators.push( /** @type {EVENT_VOICE} */ ({
                        generator: generatorNode,
                        vo: oscillatorVO,
                        frequency: frequency,
                        gain: oscillatorGain,
                        outputNode: adsrNode,
                        gliding: false
                    }));
                }
            });
            instrumentEvents[ instrument.id ][ event.id ] = /** @type {Array.<EVENT_VOICE>} */ ( oscillators );
        }

        // module parameter change specified ? process it inside the ModuleUtil

        if (event.mp) {
            ModuleUtil.applyModuleParamChange(
                event,
                instrumentModules[ instrument.id ],
                instrument,
                instrumentEvents[ instrument.id ],
                startTimeInSeconds || audioContext.currentTime,
                masterBus
            );
        }
    },
    /**
     * immediately stop playing audio for the given event
     *
     * @param {AUDIO_EVENT} event
     */
    noteOff(event) {
        const eventObject = instrumentEvents[ event.instrument ][ event.id ];

        //console.log(`NOTE OFF FOR ${event.id} ( ${event.note}${event.octave} @ ${audioContext.currentTime}`);

        if ( eventObject ) {

            const modules = instrumentModules[ event.instrument ];

            eventObject.forEach(( event ) =>
            {
                const oscillator = event.generator,
                      output     = event.outputNode;

                // apply release envelopes

                ADSR.applyAmpRelease  ( event.vo, output,     audioContext.currentTime );
                ADSR.applyPitchRelease( event.vo, oscillator, audioContext.currentTime );

                // stop synthesis and remove note on release end

                AudioUtil.createTimer( audioContext, audioContext.currentTime + event.vo.adsr.release,
                    handleOscillatorStop.bind( oscillator, output, modules ));
            });
        }
        delete instrumentEvents[ event.instrument ][ event.id ];
    },
    /**
     * apply the module settings described in the currently active
     * songs model onto the audio processing chain
     */
    applyModules(song) {
        song.instruments.forEach(( instrument, index ) => {
            const instrumentModule = instrumentModules[ index ];
            instrumentModule.output.gain.value = instrument.volume;
            ModuleFactory.applyConfiguration('filter', instrumentModule, instrument.filter, masterBus);
            ModuleFactory.applyConfiguration('delay', instrumentModule, instrument.delay, masterBus);
            ModuleFactory.applyConfiguration('eq', instrumentModule, instrument.eq, masterBus);
            ModuleFactory.applyConfiguration('overdrive', instrumentModule, instrument.overdrive, masterBus);
        });
    },
    applyModule(type, instrumentIndex, props) {
        ModuleFactory.applyConfiguration(type, instrumentModules[instrumentIndex], props, masterBus);
    },
    cacheAllOscillators(instrumentIndex, instrument) {
        instrument.oscillators.forEach((oscillator, oscillatorIndex) => {
            AudioService.updateOscillator('waveform', instrumentIndex, oscillatorIndex, oscillator )
        });
    },
    updateOscillator(property, instrumentIndex, oscillatorIndex, oscillator) {
        if (!/waveform|tuning|volume/.test(property))
            throw new Error(`cannot update unsupported oscillator property ${property}`);

        const events = instrumentEvents[instrumentIndex];
        switch (property) {
            case 'waveform':
                if ( oscillator.enabled && oscillator.waveform === 'CUSTOM' ) {
                    InstrumentUtil.adjustEventWaveForms(events, oscillatorIndex,
                        createTableFromCustomGraph(instrumentIndex, oscillatorIndex, oscillator.table)
                    );
                }
                else {
                    InstrumentUtil.adjustEventWaveForms(events, oscillatorIndex, pool[oscillator.waveform] );
                }
                break;
            case 'volume':
                InstrumentUtil.adjustEventVolume(events, oscillatorIndex, oscillator);
                break;
            case 'tuning':
                InstrumentUtil.adjustEventTunings(events, oscillatorIndex, oscillator);
                break;
        }
    },
    adjustInstrumentVolume(instrumentIndex, volume) {
        instrumentModules[instrumentIndex].output.gain.value = volume;
    }
};
export default AudioService;

/* internal methods */

function setupRouting()
{
    masterBus  = AudioFactory.createGainNode( audioContext );
    eq         = audioContext.createBiquadFilter();
    eq.type    = "highpass";
    eq.frequency.value = 30;
    compressor = audioContext.createDynamicsCompressor();
    masterBus.connect( eq );
    eq.connect( compressor );
    compressor.connect( audioContext.destination );
}

function createModules()
{
    let i, module;

    // clean up and disconnect old modules (if existed)
    if ( instrumentModules && instrumentModules.length > 0 )
    {
        i = instrumentModules.length;
        while ( i-- )
        {
            module = instrumentModules[ i ];
            module.output.disconnect();
            module.filter.filter.disconnect();
        }
    }

    // create new modules
    instrumentModules = new Array( Config.INSTRUMENT_AMOUNT );

    for ( i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
    {
        module = instrumentModules[ i ] = {
            output    : AudioFactory.createGainNode( audioContext ),
            overdrive : ModuleFactory.createOverdrive( audioContext ),
            eq        : ModuleFactory.createEQ( audioContext ),
            filter    : ModuleFactory.createFilter( audioContext ),
            delay     : ModuleFactory.createDelay( audioContext )
        };
        ModuleUtil.applyRouting( module, masterBus );
    }
}

function handleOscillatorStop( output, modules ) {
    // this === an OscillatorNode (this function invocation is bound by the noteOff()-method)
    AudioFactory.stopOscillation(/** @type {OscillatorNode} */( this ), audioContext.currentTime);

    // disconnect oscillator and its output node from the instrument output

    this.disconnect();
    output.disconnect(modules.output);
}

/**
 * create a periodicWaveTable (which can be used with a OscillatorNode for playback)
 * from an Array of custom drawn points
 *
 * @private
 *
 * @param {number} instrumentIndex index of the instrument within the pool
 * @param {number} oscillatorIndex index of the oscillator within the instrument
 * @param {Array.<number>} table list of points
 * @return {PeriodicWave} the created WaveTable
 */
function createTableFromCustomGraph( instrumentIndex, oscillatorIndex, table ) {
    return pool.CUSTOM[ instrumentIndex ][ oscillatorIndex ] = AudioUtil.createWaveTableFromGraph( audioContext, table );
}

function handleRecordingComplete(blob) {
    // download file to disk

    const pom = document.createElement('a');
    pom.setAttribute('href', window.URL.createObjectURL(blob));
    pom.setAttribute('target', '_blank' ); // helps for Safari (opens content in window...)
    pom.setAttribute('download', 'efflux-output.wav');
    pom.click();

    // free recorder resources

    recorder.clear();
    recorder  = null;
    recordOutput = false;

    window.URL.revokeObjectURL(blob);

    store.commit('showNotification', { message: store.getters.getCopy('RECORDING_SAVED') });
}
