/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
import type { Sample, SamplePitch } from "@/model/types/sample";
import { fileToBase64 } from "@/utils/file-util";

export type XTKSample = {
    b  : string; // base64 encoded source buffer
    n  : string;
    s  : number;
    e  : number;
    lp : boolean;
    p  : SamplePitch | null;
    sr : number;
    l  : number;
    sl : { s: number, e: number }[];
    t  : number;
};

/**
 * Serializes a sample Object into JSON
 */
export const serialize = async ( sample: Sample ): Promise<XTKSample> => {
    let source: File | Blob | string;
    const toJSON = (): XTKSample => ({
        b  : source as string,
        n  : sample.name,
        s  : sample.rangeStart,
        e  : sample.rangeEnd,
        lp : sample.loop,
        p  : sample.pitch,
        sr : sample.rate,
        l  : sample.duration,
        sl : sample?.slices.map( slice => ({ s: slice.rangeStart, e: slice.rangeEnd })),
        t  : sample.type,
    });
    return new Promise(( resolve, reject ): void => {
        // we serialize the source instead of the buffer
        // as the latter is uncompressed audio and thus significantly larger.
        // this serialization will only happen on first save as the
        // deserializer will keep the source intact
        source = sample.source;
        if ( source instanceof Blob ) { // also true for Files
            fileToBase64( source )
                .then(( result: string ) => {
                    source = result;
                    resolve( toJSON() );
                }).catch( reject );
        } else {
            resolve( toJSON() );
        }
    });
};
