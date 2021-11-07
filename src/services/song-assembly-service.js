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
import SongValidator from "@/model/validators/song-validator";
import SongFactory from "@/model/factories/song-factory";

export const ASSEMBLER_VERSION = 6;

const ASSEMBLER_VERSION_CODE = "av";

/**
 * assembles a song Object from an .XTK file
 *
 * @param {Object|string} xtk
 * @return {Object}
 */
export const assemble = async xtk => {
    try {
        xtk = ( typeof xtk === "string" ) ? JSON.parse( xtk ) : xtk;

        const xtkVersion = xtk[ ASSEMBLER_VERSION_CODE ]; // is ASSEMBLER_VERSION used during save

        // first check if XTK had been saved after having been disassembled

        if ( typeof xtkVersion === "number" ) {

            const song = await SongFactory.assemble( xtk, xtkVersion );

            // perform transformation on legacy songs
            SongValidator.transformLegacy( song );

            return song;
        }
        else {
            // no assembly present on the XTK, assume legacy Song (is Object)
            return xtk;
        }
    }
    catch ( e ) {
        return null;
    }
};

/**
 * SongAssembly is used to convert a Song Object into an .XTK representation
 * for file storage. While an .XTK is still a JSON Object, some properties are omitted / renamed
 * to limit filesize
 */
export default
{
    assemble,
    /**
     * disassembles a song Object into an .XTK file
     *
     * @param {SONG} song
     * @return {string}
     */
    async disassemble( song ) {
        const xtk = await SongFactory.disassemble( song );

        xtk[ ASSEMBLER_VERSION_CODE ] = ASSEMBLER_VERSION;

        return JSON.stringify( xtk );
    }
};
