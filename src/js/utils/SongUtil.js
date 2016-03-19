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
var PatternFactory = require( "../factory/PatternFactory" );
var NoteUtil       = require( "./NoteUtil" );

module.exports =
{
    /**
     * validates whether the song has any pattern content
     *
     * @public
     * @param {Object} song
     * @return {boolean}
     */
    hasContent : function( song )
    {
        var hasContent = false;

        song.patterns.forEach( function( songPattern )
        {
            songPattern.channels.forEach( function( channel )
            {
                channel.forEach( function( pattern )
                {
                    if ( pattern && pattern.sound ) {
                        hasContent = true;
                    }
                });
            });
        });
        return hasContent;
    },

    /**
     * removes all existing song notes that don't existing in the given tuning
     *
     * @param {Object} song
     * @param {Object} tuning TIA tuning
     */
    sanitizeForTuning : function( song, tuning )
    {
        var i, j, p, ps, t, found, remove;

        song.patterns.forEach( function( songPattern )
        {
            songPattern.channels.forEach( function( channel )
            {
                i = channel.length;
                while ( i-- )
                {
                    p = channel[ i ];
                    remove = false;

                    if ( p && p.sound && !NoteUtil.isPercussive( p.sound ))
                    {
                        t = tuning[ p.sound ];

                        if ( t !== undefined ) // sound type exists in tuning
                        {
                            found = false;
                            j = t.length;

                            while ( j-- ) {
                                ps = t[ j ];

                                if ( ps.note === p.note && ps.octave === p.octave )
                                    found = true; // note + octave exists for tunings sound type
                            }
                            if ( !found )
                                remove = true;
                        }
                        else
                            remove = true;
                    }
                    if ( remove )
                        channel[ i ] = PatternFactory.generateEmptyPatternStep();
                }
            });
        });
    }
};
