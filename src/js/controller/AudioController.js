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
            event = events[ key ];

            if ( event ) {
                event.forEach( function( oscillator ) {
                    AudioFactory.stopOscillation( oscillator );
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
        aEvent.id = ( ++UNIQUE_EVENT_ID ).toString(); // create unique event identifier

        //console.log("NOTE ON FOR " + aEvent.id + " ( " + aEvent.note + aEvent.octave + ")");
        var frequency = Pitch.getFrequency( aEvent.note, aEvent.octave );

        if ( typeof startTimeInSeconds !== "number" )
            startTimeInSeconds = audioContext.currentTime;

        var oscillators = [], oscillator;

        aInstrument.oscillators.forEach( function( oscillatorVO, oscillatorIndex )
        {
            if ( oscillatorVO.enabled ) {

                oscillator = aInstrument.oscillators[ oscillatorIndex ];
                var osc = audioContext.createOscillator(), table;

                // get WaveTable from pool

                if ( oscillatorVO.waveform !== "CUSTOM" )
                    table = pool[ oscillatorVO.waveform ];
                else
                    table = pool.CUSTOM[ aInstrument.id ][ oscillatorIndex ];

                if ( !table ) // no table ? that's a bit of a problem. what did you break!?
                    return;

                osc.setPeriodicWave( table );

                // tune event frequency to oscillator tuning

                var lfo2Tmpfreq = frequency + ( frequency / 1200 * oscillator.detune ); // 1200 cents == octave
                var lfo2freq    = lfo2Tmpfreq;

                // octave shift ( -2 to +2 )
                if ( oscillator.octaveShift !== 0 )
                {
                    if ( oscillator.octaveShift < 0 )
                        lfo2freq = lfo2Tmpfreq / Math.abs( oscillator.octaveShift * 2 );
                    else
                        lfo2freq += ( lfo2Tmpfreq * Math.abs( oscillator.octaveShift * 2 ) - 1 );
                }

                // fine shift ( -7 to +7 )
                var fineShift = ( lfo2Tmpfreq / 12 * Math.abs( oscillator.fineShift ));

                if ( oscillator.fineShift < 0 )
                    lfo2freq -= fineShift;
                 else
                    lfo2freq += fineShift;

                osc.frequency.value = lfo2freq;
                osc.connect( audioContext.destination );

                // TODO : ADSR

                AudioFactory.startOscillation( osc, startTimeInSeconds );
                AudioFactory.stopOscillation ( osc, startTimeInSeconds + aEvent.seq.length );

                oscillators.push( osc );
            }
        });
        events[ aEvent.id ] = oscillators;
    },

    /**
     * immediately stop playing audio for the given event
     *
     * @param {Object} aEvent
     */
    noteOff : function( aEvent )
    {
        var event = events[ aEvent.id ];

        //console.log("NOTE OFF FOR " + aEvent.id + " ( " + aEvent.note + aEvent.octave + ")");

        if ( event ) {

            event.forEach( function( oscillator )
            {
                AudioFactory.stopOscillation( oscillator, audioContext.currentTime );
                oscillator.disconnect();
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
            console.log("setting the custom waveform");
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
