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

module.exports =
{
    /**
     * queries whether given Object is a valid instrument.
     *
     * @see InstrumentFactory
     *
     * @public
     * @param {INSTRUMENT} instrument
     * @return {boolean}
     */
    isValid( instrument )
    {
        if ( !instrument )
            return false;

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

        return typeof instrument.id     === "number" &&
               typeof instrument.name   === "string" &&
               typeof instrument.volume === "number" &&
               (
                   typeof instrument.filter           === "object"  &&
                   typeof instrument.filter.enabled   === "boolean" &&
                   typeof instrument.filter.frequency === "number"  &&
                   typeof instrument.filter.q         === "number"  &&
                   typeof instrument.filter.speed     === "number"  &&
                   typeof instrument.filter.depth     === "number"  &&
                   typeof instrument.filter.type      === "string"  &&
                   typeof instrument.filter.lfoType   === "string"
               ) &&
               (
                   typeof instrument.delay          === "object"  &&
                   typeof instrument.delay.enabled  === "boolean" &&
                   typeof instrument.delay.type     === "number"  &&
                   typeof instrument.delay.time     === "number"  &&
                   typeof instrument.delay.feedback === "number"  &&
                   typeof instrument.delay.cutoff   === "number"  &&
                   typeof instrument.delay.offset   === "number"
               );
    }
};
