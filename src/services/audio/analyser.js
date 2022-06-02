/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the 'Software'), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export const supportsAnalysis = analyser => {
    // not supported in older Safari's
    return typeof analyser?.getFloatTimeDomainData === "function";
};

export const createAnalyser = ( inputNode, audioContext ) => {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    inputNode.connect( analyser );

    return analyser;
};

export const getAmplitude = ( analyser, buffer ) => {
    analyser.getFloatTimeDomainData( buffer );
    const { length } = buffer;

    // Compute average power over the interval
    let sumOfSquares = 0;
    for ( let i = 0; i < length; i++ ) {
        sumOfSquares += buffer[ i ] ** 2;
    }
    const avgPowerDecibels = 10 * Math.log10( sumOfSquares / length );

    return isFinite( avgPowerDecibels ) ? avgPowerDecibels : -100;
};

/**
 * Detect the dominant pitch frequency from the audio playing
 * through given analyserNode. Note this is just taking a snippet
 * of a time fragment, so this needs to be called continuously
 * when playing back a large buffer.
 */
export const detectPitch = ( analyserNode, audioContext ) => {
    let buffer = new Float32Array( analyserNode.fftSize );
    analyserNode.getFloatTimeDomainData( buffer );

    // Implements the ACF2+ algorithm
    let bufferSize = buffer.length;
    let rms = 0;

    for ( let i = 0; i < bufferSize; i++ ) {
        const val = buffer[ i ];
        rms += val * val;
    }
    rms = Math.sqrt( rms / bufferSize );

    if ( rms < 0.01 ) {
        return null; // insufficient quality signal
    }

    let r1 = 0, r2 = bufferSize - 1;
    const thres = 0.2;

    for ( let i = 0, l = bufferSize / 2; i < l; i++ ) {
        if ( Math.abs( buffer[ i ]) < thres ) {
            r1 = i;
            break;
        }
    }
    for ( let i = 1, l = bufferSize / 2; i < l; i++ ) {
        if ( Math.abs( buffer[ bufferSize - i ]) < thres ) {
            r2 = bufferSize - i;
            break;
        }
    }

    buffer     = buffer.slice( r1, r2 );
    bufferSize = buffer.length;

    const c = new Array( bufferSize ).fill( 0 );
    for ( let i = 0; i < bufferSize; i++ ) {
        for ( let j = 0, l = bufferSize - i; j < l; j++ ) {
            c[ i ] = c[ i ] + buffer[ j ] * buffer[ j + i ];
        }
    }
    let d = 0;
    while ( c[ d ] > c[ d + 1 ]) {
        d++;
    }

    let maxval = -1,
        maxpos = -1;

    for ( let i = d; i < bufferSize; i++ ) {
        if ( c[ i ] > maxval ) {
            maxval = c[ i ];
            maxpos = i;
        }
    }
    let T0 = maxpos;

    const x1 = c[ T0 - 1 ],
          x2 = c[ T0 ],
          x3 = c[ T0 + 1 ],
          a = ( x1 + x3 - 2 * x2 ) / 2,
          b = ( x3 - x1 ) / 2;

    if ( a ) {
        T0 = T0 - b / ( 2 * a );
    }
    return audioContext.sampleRate / T0;
};
