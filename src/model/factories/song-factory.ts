/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2025 - https://www.igorski.nl
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
import PatternOrderFactory from "./pattern-order-factory";
import PatternFactory from "./pattern-factory";
import SampleFactory from "./sample-factory";
import {
    SONG_ID, SONG_VERSION_ID, SONG_TYPE, SAMPLES,
    META_OBJECT, META_TITLE, META_AUTHOR, META_CREATED, META_MODIFIED,
    META_TIMING, META_TIMING_TEMPO, META_TIMING_TS_NUMERATOR, META_TIMING_TS_DENOMINATOR,
} from "../serializers/song-serializer";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import { type EffluxSong, type EffluxSongMeta, EffluxSongType } from "@/model/types/song";
import type { Instrument } from "@/model/types/instrument";
import type { Sample } from "@/model/types/sample";
import type { XTK } from "@/model/serializers/song-serializer";

export const FACTORY_VERSION = 5; // internal model version, not the same as XTK version (is serialized version, see song-assembly-service)
export const LEGACY_VERSION  = 1; // identifies songs saved before latest factory_version, see song-validator.ts

const SongFactory =
{
    create( amountOfInstruments = Config.INSTRUMENT_AMOUNT, type = EffluxSongType.TRACKER ): EffluxSong {
        const song = {
            version: FACTORY_VERSION,

            // unique identifier

            id : `${Date.now()}${Math.floor(( 1 + Math.random()) * 0x10000 ).toString( 16 )}`,

            // outline of meta data

            meta : {
                title    : "",
                author   : "",
                created  : Date.now(),
                modified : Date.now(),
                timing   : {
                    tempo : 120.0,
                    timeSigNumerator : 4,
                    timeSigDenominator : 4,
                },
            },

            // instruments

            instruments : [] as Instrument[],

            // samples

            samples : [] as Sample[],

            // data lists

            patterns : [
                PatternFactory.create( 16 )
            ],

            // pattern playback order

            order: [ 0 ] as EffluxPatternOrder,

            type,
        };

        for ( let i = 0; i < amountOfInstruments; ++i ) {
            song.instruments[ i ] = InstrumentFactory.create( i );
        }
        return song;
    },

    /**
     * deserializes a song Object from an .XTK file
     */
    async deserialize( xtk: XTK, xtkVersion: number ): Promise<EffluxSong> {
        const song = SongFactory.create( 0 );

        song.id      = xtk[ SONG_ID ];
        song.version = xtk[ SONG_VERSION_ID ];
        song.type    = xtk[ SONG_TYPE ] ?? EffluxSongType.TRACKER;
        song.meta    = deserializeMeta( xtk[ META_OBJECT ] );

        // prior to XTK_ASSEMBLER_VERSION 9 timing was just numerical tempo value, we
        // need to fix this upfront before deserializing patterns and events
        
        if ( xtkVersion < 9 || typeof song.meta.timing === "number" ) {
            const tempo = song.meta.timing as unknown as number;
            song.meta.timing = {
                tempo,
                timeSigNumerator: 4,
                timeSigDenominator: 4,
            };
        }
        song.instruments = InstrumentFactory.deserialize( xtk, xtkVersion );
        song.patterns    = PatternFactory.deserialize( xtk, xtkVersion, song.meta.timing );
        song.order       = PatternOrderFactory.deserialize( xtk, xtkVersion );

        const deserializedSamples = await Promise.all(( xtk[ SAMPLES ] || [] ).map( SampleFactory.deserialize ));
        song.samples = deserializedSamples.filter( Boolean );

        return song;
    },
};
export default SongFactory;

/* internal methods */

function deserializeMeta( xtkMeta: any ): EffluxSongMeta {
    const xtkTiming = xtkMeta[ META_TIMING ];

    return {
        title    : xtkMeta[ META_TITLE ],
        author   : xtkMeta[ META_AUTHOR ],
        created  : xtkMeta[ META_CREATED ],
        modified : xtkMeta[ META_MODIFIED ],
        // @ts-expect-error EffluxTimingMeta only introduced in XTK_ASSEMBLER_VERSION 9, before timing was numerical tempo value
        timing   : typeof xtkTiming === "number" ? xtkTiming : {
            tempo              : xtkTiming[ META_TIMING_TEMPO ],
            timeSigNumerator   : xtkTiming[ META_TIMING_TS_NUMERATOR ],
            timeSigDenominator : xtkTiming[ META_TIMING_TS_DENOMINATOR ],
        }
    };
}
