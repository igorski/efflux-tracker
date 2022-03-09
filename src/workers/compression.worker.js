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
import LZString from "lz-string";

self.addEventListener( "message", event => {
    const { cmd, data, id } = event.data;
    switch ( cmd )
    {
        default:
            break;

        // to be used with .XTK format
        // this works with binary File data
        case "compress":
            try {
                const blob = new Blob([
                    LZString.compressToBase64( JSON.stringify( data ))
                ], { type: "text/plain;charset=utf-8" });
                self.postMessage({ cmd: "complete", id, data: blob });
            } catch ( error ) {
                self.postMessage({ cmd: "loadError", id, error });
            }
            break;

        case "decompress":
            readTextFromFile( data )
                .then( fileData => {
                    const decompressed = LZString.decompressFromBase64( fileData );
                    self.postMessage({ cmd: "complete", id, data: JSON.parse( decompressed ) });
                })
                .catch( error => {
                    self.postMessage({ cmd: "loadError", id, error });
                });
            break;

        // to be used with local storage format
        // this works with UTF-16 encoded Strings
        case "compressUTF16":
            const compressedString = LZString.compressToUTF16( data );
            self.postMessage({ cmd: "complete", id, data: compressedString });
            break;

        case "decompressUTF16":
            const decompressedString = LZString.decompressFromUTF16( data );
            self.postMessage({ cmd: "complete", id, data: decompressedString });
            break;

    }
});

/* internal methods */

function readTextFromFile( file, optEncoding = "UTF-8" ) {
    const reader = new FileReader();
    return new Promise(( resolve, reject ) => {
        reader.onload = event => {
            resolve( event.target.result );
        };
        reader.onerror = reject;
        reader.readAsText( file, optEncoding );
    });
}
