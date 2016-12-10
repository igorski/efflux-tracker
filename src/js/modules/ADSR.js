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

module.exports = {

    /**
     * apply attack, decay and sustain amplitude envelopes to given gain Node
     *
     * @public
     * @param {Object} ADSR
     * @param {AudioGainNode} output
     * @param {number} startTimeInSeconds
     */
    applyAmpEnvelope( ADSR, output, startTimeInSeconds )
    {
        const envelope  = output.gain,
              attackEnd = startTimeInSeconds + ADSR.attack,
              decayEnd  = attackEnd + ADSR.decay;

        envelope.cancelScheduledValues( startTimeInSeconds );
        envelope.setValueAtTime( 0.0, startTimeInSeconds );         // envelope start value
        envelope.linearRampToValueAtTime( 1.0, attackEnd );         // attack envelope
        envelope.linearRampToValueAtTime( ADSR.sustain, decayEnd ); // decay envelope
    },

    /**
     * apply release amplitude envelope to given gain Node
     *
     * @public
     * @param {Object} ADSR
     * @param {AudioGainNode} output
     * @param {number} startTimeInSeconds
     */
    applyAmpRelease( ADSR, output, startTimeInSeconds )
    {
        const envelope = output.gain;

        envelope.cancelScheduledValues  ( startTimeInSeconds );
        envelope.setValueAtTime         ( envelope.value, startTimeInSeconds );
        envelope.linearRampToValueAtTime( 0.0, startTimeInSeconds + ADSR.release );
    },

    /**
     * apply pitch envelope to the events oscillator Node
     *
     * @public
     *
     * @param {Object} ADSR
     * @param {OscillatorNode|AudioBufferSourceNode} generator
     * @param {number} startTimeInSeconds
     */
    applyPitchEnvelope( ADSR, generator, startTimeInSeconds )
    {
        if ( ADSR.range === 0 )
            return; // do not apply pitch envelopes if no deviating pitch range was defined

        const isSample  = ( generator instanceof AudioBufferSourceNode ),
              envelope  = ( isSample ) ? generator.playbackRate : generator.frequency,
              orgValue  = ADSR.org = envelope.value,
              attackEnd = startTimeInSeconds + ADSR.attack,
              decayEnd  = attackEnd + ADSR.decay;

        const MAX_VALUE = 24; // max value we expect for range
        let step;

        if ( isSample )
            step = ( ADSR.range / MAX_VALUE );
        else
            step = orgValue + ( orgValue / 1200 ); // 1200 cents == octave

        if ( isSample && ADSR.range < 0 )
            step = -step; // inverse direction

        const shifted = step * ( ADSR.range / MAX_VALUE );

        envelope.cancelScheduledValues( startTimeInSeconds );
        envelope.setValueAtTime( orgValue, startTimeInSeconds ); // envelope start value
        envelope.linearRampToValueAtTime( orgValue + shifted, attackEnd ); // attack envelope
        envelope.linearRampToValueAtTime( orgValue + ( shifted * ADSR.sustain ), decayEnd ); // decay envelope
    },

    /**
     * apply release amplitude envelope to given gain Node
     *
     * @public
     * @param {Object} ADSR
     * @param {AudioGainNode} output
     * @param {number} startTimeInSeconds
     */
    applyPitchRelease( ADSR, generator, startTimeInSeconds )
    {
        if ( ADSR.range === 0 || typeof ADSR.org !== "number" )
            return; // do not apply pitch envelopes if no deviating pitch range was defined

        const isSample  = ( generator instanceof AudioBufferSourceNode ),
              envelope  = ( isSample ) ? generator.playbackRate : generator.frequency;

        envelope.cancelScheduledValues  ( startTimeInSeconds );
        envelope.setValueAtTime         ( envelope.value, startTimeInSeconds );
        envelope.linearRampToValueAtTime( ADSR.org, startTimeInSeconds + ADSR.release );
    }
};
