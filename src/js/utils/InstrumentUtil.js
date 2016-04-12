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
var InstrumentUtil = module.exports =
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

        var tmpFreq = frequency + ( frequency / 1200 * oscillator.detune ); // 1200 cents == octave
        var outFreq = tmpFreq;

        if ( oscillator.octaveShift !== 0 )
        {
            if ( oscillator.octaveShift < 0 )
                outFreq = tmpFreq / Math.abs( oscillator.octaveShift * 2 );
            else
                outFreq += ( tmpFreq * Math.abs( oscillator.octaveShift * 2 ) - 1 );
        }

        var fineShift = ( tmpFreq / 12 * Math.abs( oscillator.fineShift ));

        if ( oscillator.fineShift < 0 )
            outFreq -= fineShift;
         else
            outFreq += fineShift;

        return outFreq;
    },

    /**
     * alter the frequency of currently playing events to match changes
     * made to the tuning of given oscillator
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    adjustEventTunings : function( events, oscillator )
    {
        var i = events.length,
            j, event, voice;

        while ( i-- )
        {
            event = /** @type {EVENT_OBJECT} */ ( events[ i ] );

            if ( event ) {

                j = event.length;

                while ( j-- ) {
                    voice = event[ j ];
                    voice.oscillator.frequency.value = InstrumentUtil.tuneToOscillator( voice.frequency, oscillator );
                }
            }
        }
    }
};
