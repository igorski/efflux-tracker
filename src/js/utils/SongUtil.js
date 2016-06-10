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

const PatternFactory = require( "../factory/PatternFactory" );

module.exports =
{
    /**
     * validates whether the song has any pattern content
     *
     * @public
     * @param {Object} song
     * @return {boolean}
     */
    hasContent( song )
    {
        let hasContent = false;

        song.patterns.forEach( function( songPattern )
        {
            songPattern.channels.forEach( function( channel )
            {
                channel.forEach( function( pattern )
                {
                    if ( pattern && pattern.action !== 0 ) {
                        hasContent = true;
                    }
                });
            });
        });
        return hasContent;
    },

    /**
     * update the existing offsets for all of the Songs
     * audioEvents within its patterns
     *
     * @public
     * @param {Array.<PATTERN>} patterns the Songs patterns
     * @param {number} ratio by which to update the existing values
     */
    updateEventOffsets( patterns, ratio )
    {
        // reverse looping for speed
        let i, j, k, songPattern, channel, pattern;

        i = patterns.length;
        while ( i-- )
        {
            songPattern = patterns[ i ];
            j = songPattern.channels.length;

            while ( j-- )
            {
                channel = songPattern.channels[ j ];
                k = channel.length;

                while ( k-- )
                {
                    pattern = channel[ k ];

                    if ( pattern && pattern.seq ) {
                        pattern.seq.startMeasureOffset *= ratio;
                        pattern.seq.length *= ratio;
                    }
                }
            }
        }
    },

    /**
     * unset the play state of all of the songs events
     *
     * @public
     * @param {Array.<PATTERN>} patterns
     */
    resetPlayState( patterns )
    {
        patterns.forEach( function( pattern )
        {
            pattern.channels.forEach( function( channel )
            {
                channel.forEach( function( event )
                {
                    if ( event )
                        event.seq.playing = false;
                });
            });
        });
    }
};
