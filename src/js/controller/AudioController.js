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
var AudioFactory = require( "../factory/AudioFactory" );
var AudioUtil    = require( "../utils/AudioUtil" );
var Messages     = require( "../definitions/Messages" );
var Pitch        = require( "../definitions/Pitch" );
var WaveTables   = require( "../definitions/WaveTables" );
var Pubsub       = require( "pubsub-js" );

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
 *              adsr: Object
 *          }}
 */
var EVENT_VOICE;

/**
 * @type {Array.<EVENT_VOICE>}
 */
var EVENT_OBJECT;

/* private properties */

var audioContext, pool,
    UNIQUE_EVENT_ID = 0,
    events = {};

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
        iOSinit();

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

        cacheCustomTables( instruments );

        // subscribe to messages

        [ Messages.SONG_LOADED, Messages.PLAYBACK_STOPPED, Messages.SET_CUSTOM_WAVEFORM ].forEach( function( msg ) {
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

        Object.keys( events ).forEach( function( key, index )
        {
            event = /** @type {EVENT_OBJECT} */ ( events[ key ] );

            if ( event ) {
                event.forEach( function( oscillator ) {
                    AudioFactory.stopOscillation( oscillator.oscillator );
                });
            }
        });
        events          = {};
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
        // only "noteOn" actions allowed
        if ( aEvent.action !== 1 )
            return;

        aEvent.id = ( ++UNIQUE_EVENT_ID ).toString(); // create unique event identifier

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

                var lfo2Tmpfreq = frequency + ( frequency / 1200 * voice.detune ); // 1200 cents == octave
                var lfo2freq    = lfo2Tmpfreq;

                if ( voice.octaveShift !== 0 )
                {
                    if ( voice.octaveShift < 0 )
                        lfo2freq = lfo2Tmpfreq / Math.abs( voice.octaveShift * 2 );
                    else
                        lfo2freq += ( lfo2Tmpfreq * Math.abs( voice.octaveShift * 2 ) - 1 );
                }

                var fineShift = ( lfo2Tmpfreq / 12 * Math.abs( voice.fineShift ));

                if ( voice.fineShift < 0 )
                    lfo2freq -= fineShift;
                 else
                    lfo2freq += fineShift;

                oscillator.frequency.value = lfo2freq;

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

                // connect oscillator to volume envelope, connect envelope to output

                oscillator.connect( envelopeNode );
                envelopeNode.connect( audioContext.destination );

                // start playback

                AudioFactory.startOscillation( oscillator, startTimeInSeconds );

                oscillators.push( /** @type {EVENT_VOICE} */ ( { oscillator: oscillator, adsr: ADSR, envelope: envelope } ));
            }
        });
        events[ aEvent.id ] = oscillators;
    },

    /**
     * immediately stop playing audio for the given event
     *
     * @param {AUDIO_EVENT} aEvent
     */
    noteOff : function( aEvent )
    {
        var eventObject = events[ aEvent.id ];

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
        delete events[ aEvent.id ];
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
            createTableFromCustomGraph( payload[ 0 ], payload[ 1 ], payload[ 2 ]);
            break;
    }
}

/**
 * on iOS all audio is muted unless the engine has been initialized directly
 * after a user event. this method starts the engine (silently) as soon as
 * a touch interaction has occurred in the document
 */
function iOSinit()
{
    // not an actual iOS check, but we're omitting this if no touch events are available
    // as we'll silently start the engine on the very first touch interaction

    if ( !( "ontouchstart" in window ))
        return;

    var handler = function( e )
    {
        document.removeEventListener( "touchstart", handler, false );

        var source  = audioContext.createOscillator();
        source.type = 0;        // MUST be number (otherwise throws error on iOS/Chrome on mobile)

        // no need to HEAR it, though ;-)
        var noGain = AudioFactory.createGainNode( audioContext );
        source.connect( noGain );
        noGain.gain.value = 0;

        noGain.connect( audioContext.destination );
        AudioFactory.startOscillation( source, 0 );  // triggers unmute in iOS
        AudioFactory.stopOscillation ( source, 0 );  // stops the oscillation so oscillator can be garbage collected

        noGain.disconnect();
    };
    document.addEventListener( "touchstart", handler );
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
 */
function createTableFromCustomGraph( instrumentIndex, oscillatorIndex, table )
{
    pool.CUSTOM[ instrumentIndex ][ oscillatorIndex ] = AudioUtil.createWaveTableFromGraph( audioContext, table );
}
