/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
import OscillatorTypes from "@/definitions/oscillator-types";
import type { InstrumentOscillator, InstrumentAmplitudeEnvelopes, InstrumentPitchEnvelopes } from "@/model/types/instrument";
import { isAudioBufferSourceNode } from "@/services/audio/webaudio-helper";

let ADSR: InstrumentAmplitudeEnvelopes;
let PITCH: InstrumentPitchEnvelopes & { org?: number };
let envelope, attack, release, attackEnd, decayEnd, step;
const MAX_PITCH_ENVELOPE_VALUE = 24; // max value we expect for the pitch envelope's range

export default
{
    /**
     * apply attack, decay and sustain amplitude envelopes to given gain Node
     */
    applyAmpEnvelope( oscillator: InstrumentOscillator, output: GainNode, startTimeInSeconds: number ): void {
        ADSR = oscillator.adsr;

        switch ( oscillator.waveform ) {
            default:
                attack = ADSR.attack;
                break;

            // these pop! give them some subtle fade curves
            // if no custom attack has been defined

            case OscillatorTypes.SINE:
            case OscillatorTypes.TRIANGLE:
                attack = ( ADSR.attack === 0 ) ? 0.002 : ADSR.attack;
                break;
        }
        envelope  = output.gain;
        attackEnd = startTimeInSeconds + attack;
        decayEnd  = attackEnd + ADSR.decay;

        envelope.cancelScheduledValues( startTimeInSeconds );
        envelope.setValueAtTime( 0.0, startTimeInSeconds );         // envelope start value
        envelope.linearRampToValueAtTime( 1.0, attackEnd );         // attack envelope
        envelope.linearRampToValueAtTime( ADSR.sustain, decayEnd ); // decay envelope
    },
    /**
     * apply release amplitude envelope to given gain Node
     */
    applyAmpRelease( oscillator: InstrumentOscillator, output: GainNode, startTimeInSeconds: number ): void {
        ADSR = oscillator.adsr;

        switch ( oscillator.waveform ) {
            default:
                release = ADSR.release;
                break;

            // these pop! give them some subtle fade curves
            // if no custom attack has been defined

            case OscillatorTypes.SINE:
            case OscillatorTypes.TRIANGLE:
                release = ( ADSR.release === 0 ) ? 0.002 : ADSR.release;
                break;
        }
        envelope = output.gain;

        envelope.cancelScheduledValues  ( startTimeInSeconds );
        envelope.setValueAtTime         ( envelope.value, /* ADSR.sustain, */ startTimeInSeconds );
        envelope.linearRampToValueAtTime( 0.0, startTimeInSeconds + release );
    },
    /**
     * apply pitch envelope to the events oscillator Node
     */
    applyPitchEnvelope( oscillator: InstrumentOscillator, generator: OscillatorNode | AudioBufferSourceNode, startTimeInSeconds: number ): void {
        PITCH = oscillator.pitch;

        if ( PITCH.range === 0 ) {
            return; // do not apply pitch envelopes if no deviating pitch range was defined
        }
        const isSample  = isAudioBufferSourceNode( generator );

        // @ts-expect-error referencing non-interchangeable properties of OscillatorNode and AudioBufferSourceNode
        envelope  = ( isSample ) ? generator.playbackRate : generator.frequency;

        attackEnd = startTimeInSeconds + PITCH.attack;
        decayEnd  = attackEnd + PITCH.decay;

        const orgValue = PITCH.org = envelope.value;

        if ( isSample ) {
            step = ( PITCH.range / MAX_PITCH_ENVELOPE_VALUE );
        } else {
            step = orgValue + ( orgValue / 1200 ); // 1200 cents == octave
        }

        if ( isSample && PITCH.range < 0 ) {
            step = -step; // inverse direction
        }
        const shifted = step * ( PITCH.range / MAX_PITCH_ENVELOPE_VALUE );

        envelope.cancelScheduledValues( startTimeInSeconds );
        envelope.setValueAtTime( orgValue, startTimeInSeconds ); // envelope start value
        envelope.linearRampToValueAtTime( orgValue + shifted, attackEnd ); // attack envelope
        envelope.linearRampToValueAtTime( orgValue + ( shifted * PITCH.sustain ), decayEnd ); // decay envelope
    },
    /**
     * apply release pitch envelope to given oscillator Node
     */
    applyPitchRelease( oscillator: InstrumentOscillator, generator: OscillatorNode | AudioBufferSourceNode, startTimeInSeconds: number ): void {
        PITCH = oscillator.pitch;

        if ( PITCH.range === 0 || typeof PITCH.org !== "number" ) {
            return; // do not apply pitch envelopes if no deviating pitch range was defined
        }
        // @ts-expect-error referencing non-interchangeable properties of OscillatorNode and AudioBufferSourceNode
        envelope = isAudioBufferSourceNode( generator ) ? generator.playbackRate : generator.frequency;

        envelope.cancelScheduledValues  ( startTimeInSeconds );
        envelope.setValueAtTime         ( envelope.value, startTimeInSeconds );
        envelope.linearRampToValueAtTime( PITCH.org, startTimeInSeconds + PITCH.release );
    }
};
