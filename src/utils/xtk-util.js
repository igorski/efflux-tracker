/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
import { compress, decompress } from "@/services/compression-service";
import SongAssemblyService from "@/services/song-assembly-service";
import { readTextFromFile } from "@/utils/file-util";

/**
 * XTK parser in several stages. Assumes latest binary format but
 * can retry to parse several legacy formats.
 *
 * @param {File|Blob|String} xtkFileOrString
 * @return {Object} parsed Song
 */
export const parseXTK = async xtkFileOrString => {
    const isFile = xtkFileOrString instanceof Blob; // also true for Files
    let songData;
    try {
        // .xtk files are preferably compressed binary files
        songData = await decompress( xtkFileOrString );
        if ( !songData && isFile ) {
            // however, previous versions were compressed JSON strings
            songData = await readTextFromFile( xtkFileOrString );
        }
    } catch {
        // legacy songs were base64 encoded Strings
        // attempt decode for backwards compatibility
        let xtkString = isFile ? await readTextFromFile( xtkFileOrString ) : xtkFileOrString;
        try {
            songData = window.atob( xtkString );
        } catch {
            // assume non-encoded song in Stringified JSON format
            songData = xtkString;
        }
    }
    return await SongAssemblyService.assemble( songData );
};

/**
 * All newly stored .XTK files are serialized
 * as compressed binary files
 */
export const toXTK = async songJSON => compress( await SongAssemblyService.disassemble( songJSON ));
