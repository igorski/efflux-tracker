/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
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
import type { Instrument } from "@/model/types/instrument";

export default
{
    /**
     * queries whether given Object is a valid instrument.
     *
     * @see InstrumentFactory
     */
    isValid( instrument?: Instrument ): boolean {
        if ( !instrument ) {
            return false;
        }
        if ( !Array.isArray( instrument.oscillators )) {
            return false;
        }

        let i = instrument.oscillators.length, oscillator;

        while ( i-- ) {

            oscillator = instrument.oscillators[ i ];

            if ( typeof oscillator.enabled     !== "boolean" ||
                 typeof oscillator.waveform    !== "string"  ||
                 typeof oscillator.volume      !== "number"  ||
                 typeof oscillator.detune      !== "number"  ||
                 typeof oscillator.octaveShift !== "number"  ||
                 typeof oscillator.fineShift   !== "number"  ||
                 (
                     typeof oscillator.adsr         !== "object" ||
                     typeof oscillator.adsr.attack  !== "number" ||
                     typeof oscillator.adsr.decay   !== "number" ||
                     typeof oscillator.adsr.sustain !== "number" ||
                     typeof oscillator.adsr.release !== "number"
                 )
                 && ( oscillator.table === 0 || Array.isArray( oscillator.table )))
            {

                return false;
            }
        }

        const validMeta = typeof instrument.index  === "number" &&
                          typeof instrument.name   === "string" &&
                          typeof instrument.volume === "number";

        if ( !validMeta ) return false;

        const validFilter = (
            typeof instrument.filter           === "object"  &&
            typeof instrument.filter.enabled   === "boolean" &&
            typeof instrument.filter.frequency === "number"  &&
            typeof instrument.filter.q         === "number"  &&
            typeof instrument.filter.speed     === "number"  &&
            typeof instrument.filter.depth     === "number"  &&
            typeof instrument.filter.type      === "string"  &&
            typeof instrument.filter.lfoType   === "string"
        );

        if ( !validFilter ) return false;
        
        const validDelay = (
            typeof instrument.delay          === "object"  &&
            typeof instrument.delay.enabled  === "boolean" &&
            typeof instrument.delay.type     === "number"  &&
            typeof instrument.delay.time     === "number"  &&
            typeof instrument.delay.feedback === "number"  &&
            typeof instrument.delay.cutoff   === "number"  &&
            typeof instrument.delay.offset   === "number"
        );

        if ( !validDelay ) return false;

        // EQ and overdrive modules were added at a later stage

        const validEQ = typeof instrument.eq === "undefined" ? true : (
            typeof instrument.eq          === "object"  &&
            typeof instrument.eq.enabled  === "boolean" &&
            typeof instrument.eq.lowGain  === "number"  &&
            typeof instrument.eq.midGain  === "number"  &&
            typeof instrument.eq.highGain === "number"
        );

        if ( !validEQ ) return false

        const validOD = typeof instrument.overdrive === "undefined" ? true : (
            typeof instrument.overdrive          === "object"  &&
            typeof instrument.overdrive.enabled  === "boolean" &&
            typeof instrument.overdrive.preBand  === "number" &&
            typeof instrument.overdrive.postCut  === "number" &&
            typeof instrument.overdrive.color    === "number" &&
            typeof instrument.overdrive.drive    === "number"
        );

        if ( !validOD ) return false;

        return true;
    },

};
