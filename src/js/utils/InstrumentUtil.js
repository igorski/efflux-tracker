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
"use strict";

const InstrumentUtil = module.exports =
{
    /**
     * tune given frequency to given oscillators tuning
     *
     * @public
     *
     * @param {number} frequency in Hz
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     * @return {number} tuned frequency in Hz
     */
    tuneToOscillator : function( frequency, oscillator )
    {
        // tune event frequency to oscillator tuning

        const tmpFreq = frequency + ( frequency / 1200 * oscillator.detune ); // 1200 cents == octave
        let outFreq = tmpFreq;

        if ( oscillator.octaveShift !== 0 )
        {
            if ( oscillator.octaveShift < 0 )
                outFreq = tmpFreq / Math.abs( oscillator.octaveShift * 2 );
            else
                outFreq += ( tmpFreq * Math.abs( oscillator.octaveShift * 2 ) - 1 );
        }

        const fineShift = ( tmpFreq / 12 * Math.abs( oscillator.fineShift ));

        if ( oscillator.fineShift < 0 )
            outFreq -= fineShift;
         else
            outFreq += fineShift;

        return outFreq;
    },

    /**
     * get a buffer playback speed in the -1 to +1 range
     * for given oscillator tuning
     *
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     * @return {number}
     */
    tuneBufferPlayback : function( oscillator )
    {
        return 1 + ( oscillator.detune / 50 );
    },

    /**
     * alter the frequency of currently playing events to match changes
     * made to the tuning of given oscillator
     *
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {number} oscillatorIndex
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    adjustEventTunings : function( events, oscillatorIndex, oscillator )
    {
        let i = events.length,
            event, voice, generator;

        while ( i-- )
        {
            if ( event = events[ i ] ) {

                if ( event.length > oscillatorIndex ) {

                    voice     = event[ oscillatorIndex ];
                    generator = voice.generator;

                    if ( generator instanceof OscillatorNode )
                        generator.frequency.value = InstrumentUtil.tuneToOscillator( voice.frequency, oscillator )

                    else if ( generator instanceof AudioBufferSourceNode )
                        generator.playbackRate.value = InstrumentUtil.tuneBufferPlayback( oscillator );
                }
            }
        }
    },

    /**
     * alter the frequency of currently playing events to match changes
     * made to the tuning of given oscillator
     *
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {number} oscillatorIndex
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    adjustEventVolume : function( events, oscillatorIndex, oscillator )
    {
        let i = events.length,
            event, voice;

        while ( i-- )
        {
            if ( event = events[ i ] ) {

                if ( event.length > oscillatorIndex ) {

                    voice = event[ oscillatorIndex ];
                    voice.gain.gain.value = oscillator.volume;
                }
            }
        }
    },

    /**
     * alter the wavetable of currently playing events to match
     * changes made to the waveform of given oscillator
     *
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {number} oscillatorIndex
     * @param {PeriodicWave} table
     */
    adjustEventWaveForms : function( events, oscillatorIndex, table )
    {
        if ( !( table instanceof PeriodicWave ))
            return;

        let i = events.length, event, generator;

        while ( i-- )
        {
            if ( event = events[ i ] ) {

                if ( event.length > oscillatorIndex ) {

                    if (( generator = event[ oscillatorIndex].generator ) instanceof OscillatorNode )
                        generator.setPeriodicWave( table );
                }
            }
        }
    }
};
