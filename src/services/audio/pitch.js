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

/**
 * @param {string} aNote - musical note to return ( A, B, C, D, E, F, G with
 *               possible enharmonic notes ( 'b' meaning 'flat', '#' meaning 'sharp' )
 *               NOTE: flats are CASE sensitive ( to prevent seeing the note 'B' instead of 'b' )
 * @param {number} aOctave - the octave to return ( accepted range 0 - 9 )
 * @return {number} containing exact frequency in Hz for requested note
 */
export const getFrequency = ( aNote, aOctave ) => {
    let freq;
    let enharmonic = 0;

    // detect flat enharmonic
    let i = aNote.indexOf( "b" );
    if ( i > -1 ) {
        aNote = aNote.substr( i - 1, 1 );
        enharmonic = -1;
    }

    // detect sharp enharmonic
    i = aNote.indexOf( "#" );
    if ( i > -1 ) {
        aNote = aNote.substr( i - 1, 1 );
        enharmonic = 1;
    }

    freq = getOctaveIndex( aNote, enharmonic );

    if ( aOctave === 4 ) {
        return freq;
    }
    else {
        // translate the pitches to the requested octave
        const d = aOctave - 4;
        let j = Math.abs( d );

        for ( i = 0; i < j; ++i ) {
            if ( d > 0 ) {
                freq *= 2;
            }
            else {
                freq *= 0.5;
            }
        }
        return freq;
    }
};

/**
 * takes a frequency in Hz and returns the pitch, octave and cents off the perfect center
 *
 * @param {number} frequency
 * @return {{
 *             note: string,
 *             octave: number,
 *             cents: number
 *         }}
*/
export const getPitchByFrequency = frequency => {
    let note;

    const lnote = ( Math.log ( frequency ) - Math.log( 261.626 )) / Math.log( 2 ) + 4.0;
    let octave  = lnote|0; // fast flooring of positive values
    let cents   = 1200 * ( lnote - octave );

    const note_table = "C C#D D#E F F#G G#A A#B";
    let offset       = 50.0;
    let x            = 2;

    if ( cents < 50 ) {
        note = "C ";
    }
    else if ( cents >= 1150 ) {
        note = "C ";
        cents -= 1200;
        ++octave;
    }
    else {
        for ( let j = 1; j <= 11 ; ++j ) {
            if ( cents >= offset && cents < ( offset + 100 )) {
                note = note_table.charAt( x ) + note_table.charAt( x + 1 );
                cents -= ( j * 100 );
                break;
            }
            offset += 100;
            x += 2;
        }
    }
    return { note: note.trim(), octave, cents };
};

/**
 * Converts the interval between two frequencies (in Hz) as cents
 * @param {Number} f1 frequency in Hz
 * @param {Number} f2 frequency in Hz
 * @returns {Number} delta in cents
 */
export const intervalToCents = ( f1, f2 ) => 1200 * Math.log( f2 / f1 ) / Math.log( 2 );

export const createPitchAnalyser = ( outputNode, audioContext ) => {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    outputNode.connect( analyser );

    return analyser;
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

const Pitch =
{
    /**
     * order of note names within a single octave
     *
     * @type {Array<string>}
     */
    OCTAVE_SCALE : [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ],

    /**
     * pitch table for all notes from C to B at octave 4
     * is used for calculating all pitches at other octaves
     *
     * @type {Array<number>}
     */
    OCTAVE : [ 261.626, 277.183, 293.665, 311.127, 329.628, 349.228, 369.994, 391.995, 415.305, 440, 466.164, 493.883 ],

    getFrequency,
    getPitchByFrequency
};
export default Pitch;

/* internal methods */

/**
 * retrieves the index in the octave array for a given note
 * modifier enharmonic returns the previous ( for a 'flat' note )
 * or next ( for a 'sharp' note ) index
 *
 * @param {string} aNote ( A, B, C, D, E, F, G )
 * @param {number=} aEnharmonic optional, defaults to 0 ( 0, -1 for flat, 1 for sharp )
 * @return {number}
 */
function getOctaveIndex( aNote, aEnharmonic ) {
    if ( typeof aEnharmonic !== 'number' )
        aEnharmonic = 0;

    const octave = Pitch.OCTAVE;
    const scale  = Pitch.OCTAVE_SCALE;

    for ( let i = 0, j = octave.length; i < j; ++i ) {
        if ( scale[ i ] === aNote ) {
            let k = i + aEnharmonic;

            if ( k > j )
                return octave[ 0 ];
            if ( k < 0 )
                return octave[ octave.length - 1 ];

            return octave[ k ];
        }
    }
    return NaN;
}
