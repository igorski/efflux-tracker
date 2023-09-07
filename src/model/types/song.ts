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
import type { EffluxPatternOrder } from "./pattern-order";
import type { EffluxPattern } from "./pattern";
import type { Instrument } from "./instrument";
import type { Sample } from "@/model/types/sample";

export type EffluxSongMeta = {
    title: string;
    author: string;
    created: number;
    modified: number;
    tempo: number;
};

export type EffluxSongOrigin = "local" | "dropbox" | undefined;

/**
 * type definition for a Song
 *
 * @see SongFactory, SongValidator
 */
export type EffluxSong = {
    version: number;
    id: string;
    meta: EffluxSongMeta,
    instruments: Instrument[];
    patterns: EffluxPattern[];
    order: EffluxPatternOrder;
    samples: Sample[];
    origin?: EffluxSongOrigin;
};

export type StoredEffluxSongDescriptor = {
    id: string;
    meta: EffluxSongMeta;
};
