/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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
"use strict";

const Pitch = module.exports =
{
    /**
     * order of note names within a single octave
     *
     * @public
     * @type {Array.<string>}
     */
    OCTAVE_SCALE : [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ],

    /**
     * pitch table for all notes from C to B at octave 4
     * is used for calculating all pitches at other octaves
     *
     * @public
     * @type {Array.<number>}
     */
    OCTAVE : [ 261.626, 277.183, 293.665, 311.127, 329.628, 349.228, 369.994, 391.995, 415.305, 440, 466.164, 493.883 ],

    /**
     * @public
     *
     * @param {string} aNote - musical note to return ( A, B, C, D, E, F, G with
     *               possible enharmonic notes ( 'b' meaning 'flat', '#' meaning 'sharp' )
     *               NOTE: flats are CASE sensitive ( to prevent seeing the note 'B' instead of 'b' )
     * @param {number} aOctave - the octave to return ( accepted range 0 - 9 )
     * @return {number} containing exact frequency in Hz for requested note
     */
    getFrequency : function( aNote, aOctave )
    {
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

        freq = Pitch.getOctaveIndex( aNote, enharmonic );

        if ( aOctave === 4 ) {
            return freq;
        }
        else
        {
            // translate the pitches to the requested octave

            let d = aOctave - 4;
            let j = Math.abs( d );

            for ( i = 0; i < j; ++i )
                ( d > 0 ) ? freq *= 2 : freq *= .5;

            return freq;
        }
    },

    /**
     * takes a frequency in Hz and returns the pitch, octave and cents off the perfect center
     *
     * @public
     *
     * @param {number} frequency
     * @return {{
     *             note: string,
     *             octave: number,
     *             cents: number
     *         }}
    */
    getPitchByFrequency : function( frequency )
    {
        let theNote;

        const lnote       = ( Math.log ( frequency ) - Math.log( 261.626 )) / Math.log( 2 ) + 4.0;
        let oct         = lnote|0; // fast flooring of positive values
        let theCents    = 1200 * ( lnote - oct );

        const note_table = "C C#D D#E F F#G G#A A#B";
        let offset       = 50.0;
        let x            = 2;

        if ( theCents < 50 ) {
            theNote = "C ";
        }
        else if ( theCents >= 1150 ) {
            theNote = "C ";
            theCents -= 1200;
            ++oct;
        }
        else {
            for ( let j = 1; j <= 11 ; ++j )
            {
                if ( theCents >= offset && theCents < ( offset + 100 ))
                {
                    theNote = note_table.charAt( x ) + note_table.charAt( x + 1 );
                    theCents -= ( j * 100 );
                    break;
                }
                offset += 100;
                x += 2;
            }
        }
        return { "note" : theNote, "octave" : oct, "cents" : theCents };
    },

    /**
     * retrieves the index in the octave array for a given note
     * modifier enharmonic returns the previous ( for a 'flat' note )
     * or next ( for a 'sharp' note ) index
     *
     * @public
     *
     * @param {string} aNote ( A, B, C, D, E, F, G )
     * @param {number=} aEnharmonic optional, defaults to 0 ( 0, -1 for flat, 1 for sharp )
     * @return {number}
     */
    getOctaveIndex : function( aNote, aEnharmonic )
    {
        if ( typeof aEnharmonic !== "number" )
            aEnharmonic = 0;

        const octave = Pitch.OCTAVE;
        const scale  = Pitch.OCTAVE_SCALE;

        for ( let i = 0, j = octave.length; i < j; ++i )
        {
            if ( scale[ i ] === aNote )
            {
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
};
