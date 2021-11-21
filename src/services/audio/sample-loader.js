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
import decode from "audio-decode";

/**
 * Loads a sample file for use within the AudioContext
 *
 * @param {File|Blob} sample
 * @returns {Promise<AudioBuffer|null>}
 */
export const loadSample = async ( sample, audioContext ) => {
    return new Promise( resolve => {
        const reader = new FileReader();
        reader.readAsArrayBuffer( sample );
        reader.onload = async ({ target }) => {
            try {
                const buffer = await audioContext?.decodeAudioData( target.result );
                resolve( buffer );
            } catch ( error ) {
                // eslint-disable-next-line no-console
                console?.warn( error );
                // there is an issue in Safari 15 where MP3 content cannot be decoded
                // (regression: worked fine in previous versions!) in this case try
                // once more using audio-decode library to decode the sample.
                try {
                    const data = await decode( target.result, { context: audioContext });
                    // eslint-disable-next-line no-console
                    console.warn(data);
                    resolve( data );
                } catch {
                    resolve( null );
                }
            }
        };
        reader.onerror = () => {
            resolve( null );
        };
    });
};
