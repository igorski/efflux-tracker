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
var Pitch        = require( "../definitions/Pitch" );

/* private properties */

var audioContext, UNIQUE_EVENT_ID = 0, events = {};

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
     * on iOS all audio is muted unless the engine has been initialized directly
     * after a user event. this method starts the engine (silently) as soon as
     * a touch interaction has occurred in the document
     *
     * @public
     */
    iOSinit : function()
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
            var noGain = AudioFactory.createGainNode( self.context );
            source.connect( noGain );
            noGain.gain.value = 0;

            noGain.connect( audioContext.destination );
            AudioFactory.startOscillation( source, 0 );  // triggers unmute in iOS
            AudioFactory.stopOscillation ( source, 0 );  // stops the oscillation so oscillator can be garbage collected

            noGain.disconnect();
        };
        document.addEventListener( "touchstart", handler );
    },

    /**
     * initialize the audioContent so we can
     * synthesize audio using the WebAudio API
     */
    init : function()
    {
        if ( typeof AudioContext !== "undefined" ) {
            audioContext = new AudioContext();
        }
        else if ( typeof webkitAudioContext !== "undefined" ) {
            audioContext = new webkitAudioContext();
        }
        else {
            throw new Error( "WebAudio API not supported" );
        }
        AudioController.iOSinit();
    },

    /**
     * halts all playing audio, flushed events and
     * resets unique event id counter
     */
    reset : function()
    {
        var oscillator;

        Object.keys( events ).forEach( function( key, index )
        {
            oscillator = events[ key ];

            if ( oscillator )
                AudioFactory.stopOscillation( oscillator );
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

        console.log("NOTE ON FOR " + aEvent.id + " ( " + aEvent.note + aEvent.octave + ")");
        var frequency = Pitch.getFrequency( aEvent.note, aEvent.octave );

        if ( typeof startTimeInSeconds !== "number" )
            startTimeInSeconds = audioContext.currentTime;

        var oscillators = [], oscillator;

        aInstrument.oscillators.forEach( function( oscillatorVO, index )
        {
            if ( oscillatorVO.enabled ) {

                oscillator = aInstrument.oscillators[ index ];
                var osc = audioContext.createOscillator();

                // TODO: cache these wave tables !!
                AudioUtil.setWaveTableFromGraph( osc, oscillator.table );

                // tune frequency to oscillator

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

                // TODO : ADSR and tuning

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

        console.log("NOTE OFF FOR " + aEvent.id + " ( " + aEvent.note + aEvent.octave + ")");

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
