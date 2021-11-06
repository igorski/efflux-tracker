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
import PatternFactory    from "./pattern-factory";
import InstrumentFactory from "./instrument-factory";

const FACTORY_VERSION = 1;

export default
{
    /**
     * @param {number} amountOfInstruments
     * @returns {SONG}
     */
    createSong( amountOfInstruments ) {
        const song = {
            version: FACTORY_VERSION, // allows backwards compatibility when updating Song Object signature

            // unique identifier

            id : `${Date.now()}${Math.floor(( 1 + Math.random()) * 0x10000 ).toString( 16 )}`,

            // outline of meta data

            meta : {
                title    : '',
                author   : '',
                created  : Date.now(),
                modified : Date.now(),
                tempo    : 120.0
            },

            // instruments

            instruments : [],

            // samples

            samples : [],

            // data lists

            /**
             * @type {Array<PATTERN>}
             */
            patterns : [
                PatternFactory.createEmptyPattern( 16 )
            ]
        };

        for ( let i = 0; i < amountOfInstruments; ++i ) {
            song.instruments[ i ] = InstrumentFactory.createInstrument( i );
        }
        return song;
    }
};
