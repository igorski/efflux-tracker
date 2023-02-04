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

/**
 * Loads a sample file for use within the AudioContext
 */
export const loadSample = async ( sampleFile: File | Blob, audioContext: BaseAudioContext ): Promise<AudioBuffer | null> => {
    return new Promise(( resolve ): void => {
        const reader = new FileReader();
        reader.readAsArrayBuffer( sampleFile );
        reader.onload = async ({ target }): Promise<void> => {
            try {
                const buffer = await audioContext?.decodeAudioData( target.result as ArrayBuffer );
                resolve( buffer );
            } catch ( error ) {
                // eslint-disable-next-line no-console
                console?.warn( error );
                // there is an issue in Safari 15 where MP3 content cannot be decoded
                // (regression: worked fine in previous versions!) in this case try
                // once more using mpg123-decoder library to decode the sample.
                // eventually we'd like to remove this code and the mpg123-decoder library.
                const { MPEGDecoderWebWorker } = await import( /* webpackChunkName: "mpg123-decoder" */ "mpg123-decoder" );
                let decoder;
                try {
                    decoder = new MPEGDecoderWebWorker();
                    await decoder.ready;
                    const { channelData, samplesDecoded, sampleRate } = await decoder.decode( new Uint8Array( target.result as ArrayBuffer ));
                    const buffer = new AudioBuffer({
                        length: samplesDecoded,
                        numberOfChannels: channelData.length,
                        sampleRate: sampleRate
                    });
                    for ( let i = 0; i < channelData.length; ++i ) {
                        buffer.copyToChannel( channelData[ i ], i );
                    }
                    resolve( buffer );
                } catch ( error2 ) {
                    // eslint-disable-next-line no-console
                    console?.warn( error2 );
                    resolve( null );
                } finally {
                    decoder?.free();
                }
            }
        };
        reader.onerror = () => {
            resolve( null );
        };
    });
};
