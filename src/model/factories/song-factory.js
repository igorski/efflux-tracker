/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
import Config from "@/config";
import InstrumentFactory from "./instrument-factory";
import PatternFactory from "./pattern-factory";
import SampleFactory from "./sample-factory";
import {
    SONG_ID, SONG_VERSION_ID, SAMPLES,
    META_OBJECT, META_TITLE, META_AUTHOR, META_CREATED, META_MODIFIED, META_TEMPO
} from "../serializers/song-serializer";

export const FACTORY_VERSION = 3;
export const LEGACY_VERSION  = 1;

const SongFactory =
{
    /**
     * @param {number} amountOfInstruments
     * @returns {SONG}
     */
    create( amountOfInstruments = Config.INSTRUMENT_AMOUNT ) {
        const song = {
            version: FACTORY_VERSION, // allows backwards compatibility when updating Song Object signature

            // unique identifier

            id : `${Date.now()}${Math.floor(( 1 + Math.random()) * 0x10000 ).toString( 16 )}`,

            // outline of meta data

            meta : {
                title    : "",
                author   : "",
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
                PatternFactory.create( 16 )
            ]
        };

        for ( let i = 0; i < amountOfInstruments; ++i ) {
            song.instruments[ i ] = InstrumentFactory.create( i );
        }
        return song;
    },

    /**
     * assembles a song Object from a serialized .XTK file
     *
     * @param {Object} xtk
     * @param {Number} xtkVersion
     * @return {Object}
     */
     async assemble( xtk, xtkVersion ) {
         const song = SongFactory.create( 0 );

         song.id      = xtk[ SONG_ID ];
         song.version = xtk[ SONG_VERSION_ID ];
         song.meta    = assembleMeta( xtk[ META_OBJECT ] );

         song.instruments = InstrumentFactory.assemble( xtk, xtkVersion );
         song.patterns    = PatternFactory.assemble( xtk, xtkVersion, song.meta.tempo );

         const assembledSamples = await Promise.all(( xtk[ SAMPLES ] || [] ).map( SampleFactory.assemble ));
         song.samples = assembledSamples.filter( Boolean );

         return song;
     },
};
export default SongFactory;

/* internal methods */

function assembleMeta( xtkMeta ) {
    return {
        title    : xtkMeta[ META_TITLE ],
        author   : xtkMeta[ META_AUTHOR ],
        created  : xtkMeta[ META_CREATED ],
        modified : xtkMeta[ META_MODIFIED ],
        tempo    : xtkMeta[ META_TEMPO ]
    };
}
