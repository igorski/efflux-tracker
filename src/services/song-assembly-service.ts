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
import SongValidator from "@/model/validators/song-validator";
import SongFactory from "@/model/factories/song-factory";
import { serialize } from "@/model/serializers/song-serializer";
import type { EffluxSong } from "@/model/types/song";

export const ASSEMBLER_VERSION = 7;

const ASSEMBLER_VERSION_CODE = "av";

/**
 * assembles a song from an .XTK file
 */
export const assemble = async ( xtk: string | any ): Promise<EffluxSong | null> => {
    try {
        xtk = ( typeof xtk === "string" ) ? JSON.parse( xtk ) : xtk;

        const xtkVersion = xtk[ ASSEMBLER_VERSION_CODE ]; // is ASSEMBLER_VERSION used during save

        // first check if XTK had been saved after having been serialized

        if ( typeof xtkVersion === "number" ) {

            const song = await SongFactory.deserialize( xtk, xtkVersion );

            // perform transformation on legacy songs
            SongValidator.transformLegacy( song );

            return song;
        }
        else {
            // no assembly present on the XTK, assume legacy Song (is Object)
            // note we invoke the SongFactory to ensure all newer properties
            // of the newer XTK format are defined.
            return {
                ...SongFactory.create(),
                ...xtk,
                // deliberate as it can be undefined for ancient XTK's
                // this will make the SongValidator inject the missing properties
                version: xtk.version
            };
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
     * serializes a song into an .XTK file
     */
    async disassemble( song: EffluxSong ): Promise<string> {
        const xtk = await serialize( song );

        xtk[ ASSEMBLER_VERSION_CODE ] = ASSEMBLER_VERSION;

        return JSON.stringify( xtk );
    }
};
