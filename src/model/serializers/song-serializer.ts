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
import type { EffluxSong } from "@/model/types/song";
import { serialize as serializeInstruments } from "./instrument-serializer";
import { serialize as serializePatterns } from "./pattern-serializer";
import { serialize as serializePatternOrder } from "./pattern-order-serializer";
import { serialize as serializeSamples } from "./sample-serializer";

/**
 * keys used when serializing Song factory
 * Objects into their JSON representation
 */
export const SONG_ID                    = "si";
export const SONG_VERSION_ID            = "sv";
export const SONG_TYPE                  = "st";
export const META_OBJECT                = "m";
export const META_TITLE                 = "t";
export const META_AUTHOR                = "a";
export const META_CREATED               = "c";
export const META_MODIFIED              = "dm";
export const META_TIMING                = "tm";
export const META_TIMING_TEMPO          = "tmt";
export const META_TIMING_TS_NUMERATOR   = "tmn";
export const META_TIMING_TS_DENOMINATOR = "tmd";
export const SAMPLES                    = "smp"

export type XTK = any;

/**
* serializes a song into an .XTK file
*/
export const serialize = async ( song: EffluxSong ): Promise<XTK> => {
    const xtk: XTK = {};

    xtk[ SONG_ID ]         = song.id;
    xtk[ SONG_VERSION_ID ] = song.version;
    xtk[ SONG_TYPE ]       = song.type;
    xtk[ META_OBJECT ]     = serializeMeta( song );

    serializeInstruments( xtk, song.instruments );
    serializePatterns( xtk, song.patterns );
    serializePatternOrder( xtk, song.order );

    xtk[ SAMPLES ] = await Promise.all( song.samples.map( serializeSamples ));

    return xtk;
};

/* internal methods */

function serializeMeta( song: EffluxSong ): object {
    const { meta }   = song;
    const { timing } = meta;

    return {
        [ META_TITLE ]    : meta.title,
        [ META_AUTHOR ]   : meta.author,
        [ META_CREATED ]  : meta.created,
        [ META_MODIFIED ] : meta.modified,
        [ META_TIMING ]   : {
            [ META_TIMING_TEMPO ]          : timing.tempo,
            [ META_TIMING_TS_NUMERATOR ]   : timing.timeSigNumerator,
            [ META_TIMING_TS_DENOMINATOR ] : timing.timeSigDenominator,
        },
    };
}
