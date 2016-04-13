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
var AudioFactory   = require( "../factory/AudioFactory" );
var AudioUtil      = require( "../utils/AudioUtil" );
var InstrumentUtil = require( "../utils/InstrumentUtil" );
var Config         = require( "../config/Config" );
var Messages       = require( "../definitions/Messages" );
var Pitch          = require( "../definitions/Pitch" );
var WaveTables     = require( "../definitions/WaveTables" );
var Pubsub         = require( "pubsub-js" );

/* type definitions */

/**
 * describes a single voice for an event (an event is
 * a note being triggered for an instrument, however the
 * instrument can have multiple voices / oscillators)
 * which are bundled for a single event in an EVENT_OBJECT
 *
 * @typedef {{
 *              oscillator: OscillatorNode,
 *              envelope: AudioParam,
 *              gain: AudioParam,
 *              frequency: number,
 *              adsr: Object
 *          }}
 */
var EVENT_VOICE;

/**
 * a single noteOn / noteOff event (can contain
 * multiple voices)
 *
 * @typedef {Array.<EVENT_VOICE>}
 */
var EVENT_OBJECT;

/* private properties */

var audioContext, masterBus, compressor, pool,
    UNIQUE_EVENT_ID = 0;

/**
 * list that will contain all EVENT_OBJECTs
 * playing back for any of the Songs instruments
 *
 * @type {Array.<Array.<EVENT_OBJECT>>}
 */
var instrumentEvents = [];

var AudioController = module.exports =
{
    /**
     * query whether we can actually use the WebAudio API in
     * the current application environment
     *
     * @return {boolean}
     */
    isSupported : function()
    {
        return ( typeof AudioContext !== "undefined" ||
                 typeof webkitAudioContext !== "undefined" );
    },

    /**
     * initializes the audioContent so we can
     * synthesize audio using the WebAudio API
     *
     * @public
     * @param {Array.<INSTRUMENT>} instruments to create WaveTables for
     */
    init : function( instruments )
    {
        if ( typeof AudioContext !== "undefined" ) {
            audioContext = new AudioContext();
        }
        else if ( typeof webkitAudioContext !== "undefined" ) {
            audioContext = new webkitAudioContext();
        }
        else {
            throw new Error( "WebAudio API not supported (try 'isSupported()' prior to invoking)" );
        }

        AudioUtil.iOSinit( audioContext );
        setupRouting();

        // initialize the WaveTable pool

        pool = {
            SAW: audioContext.createPeriodicWave(
                new Float32Array( WaveTables.SAW.real ), new Float32Array( WaveTables.SAW.imag )
            ),
            TRIANGLE: audioContext.createPeriodicWave(
                new Float32Array( WaveTables.TRIANGLE.real ), new Float32Array( WaveTables.TRIANGLE.imag )
            ),
            SQUARE: audioContext.createPeriodicWave(
                new Float32Array( WaveTables.SQUARE.real ), new Float32Array( WaveTables.SQUARE.imag )
            ),
            CUSTOM: [] // created and maintained by "cacheCustomTables()"
        };

        AudioController.reset();
        cacheCustomTables( instruments );

        // subscribe to messages

        [   Messages.SONG_LOADED,
            Messages.PLAYBACK_STOPPED,
            Messages.SET_CUSTOM_WAVEFORM,
            Messages.ADJUST_OSCILLATOR_TUNING,
            Messages.ADJUST_OSCILLATOR_VOLUME

        ].forEach( function( msg ) {
            Pubsub.subscribe( msg, handleBroadcast );
        });
    },

    /**
     * halts all playing audio, flushed events and
     * resets unique event id counter
     */
    reset : function()
    {
        var event;

        instrumentEvents.forEach( function( events, instrumentIndex )
        {
            var i = events.length,
                event;

            while ( i-- )
            {
                event = /** @type {EVENT_OBJECT} */ ( events[ i ] );

                if ( event ) {
                    event.forEach( function( voice, oscillatorIndex ) {
                        AudioFactory.stopOscillation( voice.oscillator );
                    });
                }
            }
        });

        instrumentEvents = new Array( Config.INSTRUMENT_AMOUNT );
        for ( var i = 0; i < Config.INSTRUMENT_AMOUNT; ++i )
            instrumentEvents[ i ] = [];

        UNIQUE_EVENT_ID = 0;
    },

    /**
     * retrieve a reference to the audioContext
     *
     * @return {AudioContext}
     */
    getContext : function()
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
    noteOn : function( aEvent, aInstrument, startTimeInSeconds )
    {
        // only "noteOn" actions are processed

        if ( aEvent.action !== 1 )
            return;

        aEvent.id = ( ++UNIQUE_EVENT_ID ); // create unique event identifier

        //console.log("NOTE ON FOR " + aEvent.id + " ( " + aEvent.note + aEvent.octave + ") @ " + audioContext.currentTime );

        var frequency = Pitch.getFrequency( aEvent.note, aEvent.octave );

        if ( typeof startTimeInSeconds !== "number" )
            startTimeInSeconds = audioContext.currentTime;

        var oscillators = /** @type {EVENT_OBJECT} */ ( [] ), voice;

        aInstrument.oscillators.forEach( function( oscillatorVO, oscillatorIndex )
        {
            if ( oscillatorVO.enabled ) {

                voice = aInstrument.oscillators[ oscillatorIndex ];
                var oscillator = audioContext.createOscillator(), table;

                // get WaveTable from pool

                if ( oscillatorVO.waveform !== "CUSTOM" )
                    table = pool[ oscillatorVO.waveform ];
                else
                    table = pool.CUSTOM[ aInstrument.id ][ oscillatorIndex ];

                if ( !table ) // no table ? that's a bit of a problem. what did you break!?
                    return;

                oscillator.setPeriodicWave( table );

                // tune event frequency to oscillator tuning

                oscillator.frequency.value = InstrumentUtil.tuneToOscillator( frequency, voice );

                // apply amplitude envelopes

                var envelopeNode = AudioFactory.createGainNode( audioContext ),
                    envelope = envelopeNode.gain;

                var ADSR = oscillatorVO.adsr;
                var attackEnd  = startTimeInSeconds + ADSR.attack,
                    decayEnd   = attackEnd + ADSR.decay;

                envelope.cancelScheduledValues( startTimeInSeconds );
                envelope.setValueAtTime( 0.0, startTimeInSeconds );         // envelope start value
                envelope.linearRampToValueAtTime( 1.0, attackEnd );         // attack envelope
                envelope.linearRampToValueAtTime( ADSR.sustain, decayEnd ); // decay envelope

                // connect oscillator to track gain > envelope gain > output

                var trackGain = AudioFactory.createGainNode( audioContext );
                trackGain.gain.value = oscillatorVO.volume;
                oscillator.connect( trackGain );
                trackGain.connect( envelopeNode );
                envelopeNode.connect( masterBus );

                // start playback

                AudioFactory.startOscillation( oscillator, startTimeInSeconds );

                oscillators.push( /** @type {EVENT_VOICE} */ ({
                    oscillator: oscillator,
                    adsr: ADSR,
                    envelope: envelope,
                    frequency: frequency,
                    gain: trackGain
                }));
            }
        });
        instrumentEvents[ aInstrument.id ][ aEvent.id ] = /** @type {Array.<EVENT_VOICE>} */ ( oscillators );
    },

    /**
     * immediately stop playing audio for the given event
     *
     * @param {AUDIO_EVENT} aEvent
     * @param {INSTRUMENT} aInstrument playing back the event
     */
    noteOff : function( aEvent, aInstrument )
    {
        var eventObject = instrumentEvents[ aInstrument.id ][ aEvent.id ];

        //console.log("NOTE OFF FOR " + aEvent.id + " ( " + aEvent.note + aEvent.octave + ") @ " + audioContext.currentTime );

        if ( eventObject ) {

            eventObject.forEach( function( event )
            {
                var oscillator = event.oscillator,
                    envelope   = event.envelope,
                    ADSR       = event.adsr;

                // apply release envelope

                envelope.cancelScheduledValues( audioContext.currentTime );
                envelope.setValueAtTime( envelope.value, audioContext.currentTime );
                envelope.linearRampToValueAtTime( 0.0, audioContext.currentTime + ADSR.release );

                // stop synthesis and remove note on release end

                AudioUtil.createTimer( audioContext, audioContext.currentTime + ADSR.release, function()
                {
                    AudioFactory.stopOscillation( this, audioContext.currentTime );
                    this.disconnect();

                }.bind( oscillator ));
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
        case Messages.PLAYBACK_STOPPED:
            AudioController.reset();
            break;

        case Messages.SONG_LOADED:
            AudioController.reset();
            cacheCustomTables( payload.instruments );
            break;

        case Messages.SET_CUSTOM_WAVEFORM:
            var table = createTableFromCustomGraph( payload[ 0 ], payload[ 1 ], payload[ 2 ]);
            InstrumentUtil.adjustEventWaveForms( instrumentEvents[ payload[ 0 ]], payload[ 1 ], table );
            break;

        case Messages.ADJUST_OSCILLATOR_TUNING:
            InstrumentUtil.adjustEventTunings( instrumentEvents[ payload[ 0 ]], payload[ 1 ], payload[ 2 ]);
            break;

        case Messages.ADJUST_OSCILLATOR_VOLUME:
            InstrumentUtil.adjustEventVolume( instrumentEvents[ payload[ 0 ]], payload[ 1 ], payload[ 2 ]);
            break;
    }
}

function setupRouting()
{
    masterBus  = AudioFactory.createGainNode( audioContext );
    compressor = audioContext.createDynamicsCompressor();
    masterBus.connect( compressor );
    compressor.connect( audioContext.destination );
}

/**
 * cache the custom WaveTables that are
 * available to the instruments
 *
 * @private
 * @param {Array.<INSTRUMENT>} instruments
 */
function cacheCustomTables( instruments )
{
    instruments.forEach( function( instrument, instrumentIndex )
    {
        pool.CUSTOM[ instrumentIndex ] = new Array( instrument.oscillators.length );

        instrument.oscillators.forEach( function( oscillator, oscillatorIndex ) {
            pool.CUSTOM[ instrumentIndex ][ oscillatorIndex ] = createTableFromCustomGraph(
                instrumentIndex, oscillatorIndex, oscillator.table
            );
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
