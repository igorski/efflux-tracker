/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
import InstrumentFactory from '../factories/instrument-factory';

export default
{
    /**
     * queries whether given Object is a valid song. NOTE: this is
     * NOT a deep check of all properties, but a basic check of the
     * songs outline
     *
     * @see SongFactory
     *
     * @param {SONG} song
     * @return {boolean}
     */
    isValid( song ) {
        if ( !song )
            return false;

        return typeof song.id      === 'string'    &&
               typeof song.version === 'number'    &&
               typeof song.meta    !== 'undefined' &&
               Array.isArray( song.instruments )   &&
               Array.isArray( song.patterns );
    },
    /**
     * transforms a legacy Song so its description contains
     * all properties available to newer factory versions
     *
     * @param {SONG} song
     * @return {SONG}
     */
    transformLegacy( song ) {
        if (!song || !song.instruments) {
            return null;
        }
        song.instruments.forEach(( instrument ) => {

            // pitch envelope was added in version 2 of SongAssemblyService

            instrument.oscillators.forEach(( oscillator ) => {
                if ( typeof oscillator.pitch !== 'object' )
                    InstrumentFactory.createPitchEnvelope( oscillator );
            });

            // EQ and OD were added in version 3 of SongAssemblyService

            if ( typeof instrument.eq !== 'object' )
                InstrumentFactory.createEQ( instrument );

            if ( typeof instrument.od !== 'object' )
                InstrumentFactory.createOverdrive( instrument );
        });

        // fix bug where copied channels have the wrong startMeasure offset
        // we probably want to remove this at a certain point as the source of the bug has been fixed...

        song.patterns.forEach(( pattern, patternIndex ) => {
            pattern.channels.forEach(( channel ) => {
                channel.forEach(( event ) => {
                    if ( event && event.seq ) {
                        const eventStart  = event.seq.startMeasure;
                        const eventEnd    = event.seq.endMeasure;
                        const eventLength = isNaN( eventEnd ) ? 1 : eventEnd - eventStart;

                        event.seq.startMeasure = patternIndex;
                        event.seq.endMeasure   = event.seq.startMeasure + eventLength;
                    }
                });
            });
        });
        return song;
    }
};
