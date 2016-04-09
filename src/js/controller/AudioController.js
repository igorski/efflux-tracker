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
     * @param {Object} aEvent
     * @param {number=} startTimeInSeconds optional, defaults to current time
     */
    noteOn : function( aEvent, startTimeInSeconds )
    {
        aEvent.id = ( ++UNIQUE_EVENT_ID ).toString(); // create unique event identifier

        console.log("NOTE ON FOR " + aEvent.id);
        var frequency = Pitch.getFrequency( aEvent.note, aEvent.octave );

        if ( typeof startTimeInSeconds !== "number" )
            startTimeInSeconds = audioContext.currentTime;

        events[ aEvent.id ] = AudioController.soundPitch( frequency, startTimeInSeconds, aEvent.length );
    },

    /**
     * immediately stop playing audio for the given event
     *
     * @param {Object} aEvent
     */
    noteOff : function( aEvent )
    {
        var oscillator = events[ aEvent.id ];

        console.log("NOTE OFF FOR " + aEvent.id);

        if ( oscillator )
            AudioFactory.stopOscillation( oscillator );

        delete events[ aEvent.id ];
    },

    /**
     * sound a sine wave at given frequency can be used for reference
     *
     * @param {number} frequencyInHertz
     * @param {number=} startTimeInSeconds optional, defaults to current time
     * @param {number=} durationInSeconds optional, defaults to 1 second
     *
     * @return {Oscillator} created Oscillator
     */
    soundPitch : function( frequencyInHertz, startTimeInSeconds, durationInSeconds )
    {
        var oscillator = audioContext.createOscillator();
        oscillator.connect( audioContext.destination );

        oscillator.frequency.value = frequencyInHertz;

        if ( typeof startTimeInSeconds !== "number" || startTimeInSeconds === 0 )
            startTimeInSeconds = audioContext.currentTime;

        if ( typeof durationInSeconds !== "number" )
            durationInSeconds = 1;

        // oscillator will start, stop and can be garbage collected after going out of scope

        AudioFactory.startOscillation( oscillator, startTimeInSeconds );
        AudioFactory.stopOscillation ( oscillator, startTimeInSeconds + durationInSeconds );

        return oscillator;
    }
};