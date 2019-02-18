/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2018 - http://www.igorski.nl
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

const AudioFactory   = require( "../model/factory/AudioFactory" );
const ModuleFactory  = require( "../model/factory/ModuleFactory" );
const AudioUtil      = require( "../utils/AudioUtil" );
const ModuleUtil     = require( "../utils/ModuleUtil" );
const InstrumentUtil = require( "../utils/InstrumentUtil" );
const Config         = require( "../config/Config" );
const Messages       = require( "../definitions/Messages" );
const Pitch          = require( "../definitions/Pitch" );
const WaveTables     = require( "../definitions/WaveTables" );
const Copy           = require( "../i18n/Copy" );
const ADSR           = require( "../modules/ADSR" );
const Recorder       = require( "recorderjs" );
const Pubsub         = require( "pubsub-js" );

/* type definitions */

/**
 * describes a single voice for an event (an event is
 * a note being triggered for an instrument, however the
 * instrument can have multiple voices / oscillators)
 * which are bundled for a single event in an EVENT_OBJECT
 *
 * @typedef {{
 *              generator: OscillatorNode|AudioBufferSourceNode,
 *              gain: AudioParam,
 *              outputNode: AudioParam,
 *              frequency: number,
 *              vo: INSTRUMENT_OSCILLATOR,
 *              gliding: false
 *          }}
 */
let EVENT_VOICE;

/**
 * a single noteOn / noteOff event (can contain
 * multiple voices)
 *
 * @typedef {Array.<EVENT_VOICE>}
 */
let EVENT_OBJECT;

/**
 * @typedef {{
 *              overdrive: OVERDRIVE_MODULE,
 *              eq: EQ_MODULE,
 *              filter: FILTER_MODULE,
 *              delay: DELAY_MODULE,
 *              output: AudioParam
 *          }}
 */
let INSTRUMENT_MODULES;

/* private properties */

let efflux, audioContext, masterBus, eq, compressor, pool, UNIQUE_EVENT_ID = 0,
    playing = false, recording = false, recorder;

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

const AudioController = module.exports =
{
    /**
     * query whether we can actually use the WebAudio API in
     * the current application environment
     *
     * @return {boolean}
     */
    isSupported()
    {
        return ( typeof AudioContext !== "undefined" ||
                 typeof webkitAudioContext !== "undefined" );
    },

    /**
     * initializes the audioContent so we can
     * synthesize audio using the WebAudio API
     *
     * @public
     * @param {Object} effluxRef
     * @param {Array.<INSTRUMENT>} instruments to create WaveTables for
     */
    init( effluxRef, instruments )
    {
        efflux = effluxRef;

        // asynchronously generated AudioContext (after user interaction)

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

            Object.keys( WaveTables ).forEach(( waveIdentifier ) => {
                pool[ waveIdentifier ] = audioContext.createPeriodicWave(
                    new Float32Array( WaveTables[ waveIdentifier ].real ),
                    new Float32Array( WaveTables[ waveIdentifier ].imag )
                );
            });

            AudioController.reset();
            cacheCustomTables( instruments );

            // subscribe to messages

            [   Messages.SONG_LOADED,
                Messages.PLAYBACK_STARTED,
                Messages.PLAYBACK_STOPPED,
                Messages.APPLY_INSTRUMENT_MODULES,
                Messages.TOGGLE_OUTPUT_RECORDING,
                Messages.SET_CUSTOM_WAVEFORM,
                Messages.ADJUST_OSCILLATOR_TUNING,
                Messages.ADJUST_OSCILLATOR_VOLUME,
                Messages.ADJUST_OSCILLATOR_WAVEFORM,
                Messages.ADJUST_INSTRUMENT_VOLUME,
                Messages.UPDATE_FILTER_SETTINGS,
                Messages.UPDATE_DELAY_SETTINGS,
                Messages.UPDATE_EQ_SETTINGS,
                Messages.UPDATE_OVERDRIVE_SETTINGS,
                Messages.NOTE_ON,
                Messages.NOTE_OFF

            ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));

            Pubsub.publishSync( Messages.AUDIO_CONTEXT_READY, audioContext );
        });
    },

    /**
     * halts all playing audio, flushed events and
     * resets unique event id counter
     */
    reset()
    {
        instrumentEvents.forEach(( events, instrumentIndex ) => {

            let i = events.length, event;

            while ( i-- ) {
                event = /** @type {EVENT_OBJECT} */ ( events[ i ] );

                if ( event ) {
                    event.forEach(( voice, oscillatorIndex ) => AudioFactory.stopOscillation( voice.generator ));
                }
            }
        });

        instrumentEvents = new Array( Config.INSTRUMENT_AMOUNT );
        for ( let i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
            instrumentEvents[ i ] = [];

        createModules();

        UNIQUE_EVENT_ID = 0;
    },

    /**
     * retrieve a reference to the AudioContext
     *
     * @return {AudioContext}
     */
    getContext()
    {
        return audioContext;
    },

    /**
     * synthesize the audio for given event at given startTime
     *
     * @param {AUDIO_EVENT} aEvent
     * @param {INSTRUMENT} aInstrument to playback the event
     * @param {number=} startTimeInSeconds optional, defaults to current time
     */
    noteOn( aEvent, aInstrument, startTimeInSeconds )
    {
        if ( aEvent.action === 1 ) // noteOn
        {
            aEvent.id = ( ++UNIQUE_EVENT_ID ); // create unique event identifier

            //console.log("NOTE ON FOR " + aEvent.id + " ( " + aEvent.note + aEvent.octave + ") @ " + audioContext.currentTime );

            const frequency = Pitch.getFrequency( aEvent.note, aEvent.octave );

            if ( typeof startTimeInSeconds !== "number" )
                startTimeInSeconds = audioContext.currentTime;

            let oscillators = /** @type {EVENT_OBJECT} */ ( [] ), voice;
            const modules   = instrumentModules[ aInstrument.id ];

            aInstrument.oscillators.forEach(( oscillatorVO, oscillatorIndex ) =>
            {
                if ( oscillatorVO.enabled ) {

                    voice = aInstrument.oscillators[ oscillatorIndex ];
                    const oscillatorGain = AudioFactory.createGainNode( audioContext );
                    let generatorNode;

                    // buffer source ? assign it to the oscillator

                    if ( oscillatorVO.waveform === "NOISE" ) {

                        generatorNode = audioContext.createBufferSource();
                        generatorNode.buffer = pool.NOISE;
                        generatorNode.loop = true;
                        generatorNode.playbackRate.value = InstrumentUtil.tuneBufferPlayback( voice );
                    }
                    else {

                        // has oscillator source

                        if ( oscillatorVO.waveform === "PWM" ) {
                            // PWM uses a custom Oscillator type
                            generatorNode = AudioFactory.createPWM(
                                audioContext, startTimeInSeconds, startTimeInSeconds + 2, oscillatorGain
                            );
                        }
                        else {
                            // all other waveforms have WaveTables which are defined in the pools

                            generatorNode = audioContext.createOscillator();
                            let table;

                            if ( oscillatorVO.waveform !== "CUSTOM" )
                                table = pool[ oscillatorVO.waveform ];
                            else
                                table = pool.CUSTOM[ aInstrument.id ][ oscillatorIndex ];

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
                    if ( oscillatorVO.waveform !== "PWM" )
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
            instrumentEvents[ aInstrument.id ][ aEvent.id ] = /** @type {Array.<EVENT_VOICE>} */ ( oscillators );
        }

        // module parameter change specified ? process it inside the ModuleUtil

        if ( aEvent.mp ) {
            ModuleUtil.applyModuleParamChange(
                aEvent,
                instrumentModules[ aInstrument.id ],
                efflux.activeSong.instruments[ aInstrument.id ],
                instrumentEvents[ aInstrument.id ],
                startTimeInSeconds || audioContext.currentTime,
                masterBus
            );
        }
    },

    /**
     * immediately stop playing audio for the given event
     *
     * @param {AUDIO_EVENT} aEvent
     * @param {INSTRUMENT} aInstrument playing back the event
     */
    noteOff( aEvent, aInstrument )
    {
        const eventObject = instrumentEvents[ aInstrument.id ][ aEvent.id ];

        //console.log("NOTE OFF FOR " + aEvent.id + " ( " + aEvent.note + aEvent.octave + ") @ " + audioContext.currentTime );

        if ( eventObject ) {

            const modules = instrumentModules[ aInstrument.id ];

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
        delete instrumentEvents[ aInstrument.id ][ aEvent.id ];
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.PLAYBACK_STARTED:
            playing = true;
            applyModules();
            applyRecordingState();
            break;

        case Messages.APPLY_INSTRUMENT_MODULES:
            applyModules();
            break;

        case Messages.PLAYBACK_STOPPED:
            playing = false;
            AudioController.reset();
            if ( recording && recorder ) {
                recorder.stop();
                recorder.exportWAV();
            }
            break;

        case Messages.TOGGLE_OUTPUT_RECORDING:
            recording = !recording;
            applyRecordingState();
            break;

        case Messages.SONG_LOADED:
            AudioController.reset();
            cacheCustomTables( payload.instruments );
            break;

        case Messages.SET_CUSTOM_WAVEFORM:
            const table = createTableFromCustomGraph( payload[ 0 ], payload[ 1 ], payload[ 2 ]);
            InstrumentUtil.adjustEventWaveForms( instrumentEvents[ payload[ 0 ]], payload[ 1 ], table );
            break;

        case Messages.ADJUST_OSCILLATOR_WAVEFORM:
            InstrumentUtil.adjustEventWaveForms( instrumentEvents[ payload[ 0 ]], payload[ 1 ], pool[ payload[ 2 ].waveform ] );
            break;

        case Messages.ADJUST_OSCILLATOR_TUNING:
            InstrumentUtil.adjustEventTunings( instrumentEvents[ payload[ 0 ]], payload[ 1 ], payload[ 2 ]);
            break;

        case Messages.ADJUST_OSCILLATOR_VOLUME:
            InstrumentUtil.adjustEventVolume( instrumentEvents[ payload[ 0 ]], payload[ 1 ], payload[ 2 ]);
            break;

        case Messages.ADJUST_INSTRUMENT_VOLUME:
            instrumentModules[ payload[ 0 ]].output.gain.value = payload[ 1 ];
            break;

        case Messages.UPDATE_FILTER_SETTINGS:
            ModuleFactory.applyFilterConfiguration(
                instrumentModules[ payload[ 0 ]],
                payload[ 1 ], masterBus
            );
            break;

        case Messages.UPDATE_DELAY_SETTINGS:
            ModuleFactory.applyDelayConfiguration(
                instrumentModules[ payload[ 0 ]],
                payload[ 1 ], masterBus
            );
            break;

        case Messages.UPDATE_EQ_SETTINGS:
            ModuleFactory.applyEQConfiguration(
                instrumentModules[ payload[ 0 ]],
                payload[ 1 ], masterBus
            );
            break;

        case Messages.UPDATE_OVERDRIVE_SETTINGS:
            ModuleFactory.applyODConfiguration(
                instrumentModules[ payload[ 0 ]],
                payload[ 1 ], masterBus
            );
            break;

        case Messages.NOTE_ON:
            AudioController.noteOn( payload[ 0 ], payload[ 1 ]);
            break;

        case Messages.NOTE_OFF:
            AudioController.noteOff( payload[ 0 ], payload[ 1 ]);
            break;
    }
}

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

/**
 * apply the module settings described in
 * the currently active songs model
 */
function applyModules()
{
    let instrumentModule;
    efflux.activeSong.instruments.forEach(( instrument, index ) => {
        instrumentModule = instrumentModules[ index ];
        instrumentModule.output.gain.value = instrument.volume;
        Pubsub.publishSync( Messages.UPDATE_FILTER_SETTINGS,    [ instrument.id, instrument.filter ]);
        Pubsub.publishSync( Messages.UPDATE_DELAY_SETTINGS,     [ instrument.id, instrument.delay ]);
        Pubsub.publishSync( Messages.UPDATE_EQ_SETTINGS,        [ instrument.id, instrument.eq ]);
        Pubsub.publishSync( Messages.UPDATE_OVERDRIVE_SETTINGS, [ instrument.id, instrument.overdrive ]);
    });
}

function handleOscillatorStop( output, modules )
{
    // this === an OscillatorNode (this function is bound by noteOff()-method)
    AudioFactory.stopOscillation( this, audioContext.currentTime );

    // disconnect oscillator and its output node from the instrument output

    this.disconnect();
    output.disconnect( modules.output );
}

/**
 * cache the custom WaveTables that are available to the instruments
 *
 * @private
 * @param {Array.<INSTRUMENT>} instruments
 */
function cacheCustomTables( instruments )
{
    instruments.forEach(( instrument, instrumentIndex ) =>
    {
        pool.CUSTOM[ instrumentIndex ] = new Array( instrument.oscillators.length );

        instrument.oscillators.forEach(( oscillator, oscillatorIndex ) => {

            if ( oscillator.table ) {
                pool.CUSTOM[ instrumentIndex ][ oscillatorIndex ] = createTableFromCustomGraph(
                 instrumentIndex, oscillatorIndex, oscillator.table
                );
            }
        });
    });
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
function createTableFromCustomGraph( instrumentIndex, oscillatorIndex, table )
{
    return pool.CUSTOM[ instrumentIndex ][ oscillatorIndex ] = AudioUtil.createWaveTableFromGraph( audioContext, table );
}

function applyRecordingState()
{
    if ( recording ) {
        if ( !recorder ) {
            recorder = new Recorder( masterBus, {
                callback : handleRecordingComplete
            });
        }
        if ( playing )
            recorder.record();
    }
    else if ( recorder ) {
        recorder.stop();
        recorder.exportWAV();
    }
}

function handleRecordingComplete( blob )
{
    // download file to disk

    const pom = document.createElement( "a" );
    pom.setAttribute( "href", window.URL.createObjectURL( blob ));
    pom.setAttribute( "target", "_blank" ); // helps for Safari (opens content in window...)
    pom.setAttribute( "download", "efflux-output.wav" );
    pom.click();

    // free recorder resources

    recorder.clear();
    recorder  = null;
    recording = false;

    window.URL.revokeObjectURL( blob );

    Pubsub.publish( Messages.SHOW_FEEDBACK, getCopy( "RECORDING_SAVED" ));
}
