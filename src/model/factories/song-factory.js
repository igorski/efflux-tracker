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
import Config from "@/config";
import InstrumentFactory from "./instrument-factory";
import PatternFactory from "./pattern-factory";
import SampleFactory from "./sample-factory";

export const FACTORY_VERSION = 2;
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
     * assembles a song Object from an .XTK file
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

         song.samples = await Promise.all(( xtk[ SAMPLES ] || [] ).map( SampleFactory.assemble ));

         return song;
     },

     /**
      * disassembles a song Object into an .XTK file
      *
      * @param {SONG} song
      * @return {Object}
      */
     async disassemble( song ) {
         const xtk = {};

         xtk[ SONG_ID ]         = song.id;
         xtk[ SONG_VERSION_ID ] = song.version;
         xtk[ META_OBJECT ]     = disassembleMeta( song.meta );

         InstrumentFactory.disassemble( xtk, song.instruments );
         PatternFactory.disassemble( xtk, song.patterns );

         xtk[ SAMPLES ] = await Promise.all( song.samples.map( SampleFactory.disassemble ));

         return xtk;
     }
};
export default SongFactory;

/* internal methods */

const SONG_ID         = "si",
      SONG_VERSION_ID = "sv",

      META_OBJECT     = "m",
      META_TITLE      = "t",
      META_AUTHOR     = "a",
      META_CREATED    = "c",
      META_MODIFIED   = "dm",
      META_TEMPO      = "tm",

      SAMPLES         = "smp";

function assembleMeta( xtkMeta ) {
    return {
        title    : xtkMeta[ META_TITLE ],
        author   : xtkMeta[ META_AUTHOR ],
        created  : xtkMeta[ META_CREATED ],
        modified : xtkMeta[ META_MODIFIED ],
        tempo    : xtkMeta[ META_TEMPO ]
    };
}

function disassembleMeta( meta ) {
    return {
        [ META_TITLE ]    : meta.title,
        [ META_AUTHOR ]   : meta.author,
        [ META_CREATED ]  : meta.created,
        [ META_MODIFIED ] : meta.modified,
        [ META_TEMPO ]    : meta.tempo
    };
}
