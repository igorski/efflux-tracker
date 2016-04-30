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

module.exports =
{
    /**
     * create a new empty pattern and insert it at the given index
     * for the given pattern list
     *
     * @public
     * @param {Array.<PATTERN>} patterns list of patterns
     * @param {number} index where the generated pattern will be added
     * @param {number} amountOfSteps the amount of steps in the pattern to generate
     * @return {Array.<PATTERN>} updated list
     */
    addEmptyPatternAtIndex : function( patterns, index, amountOfSteps )
    {
        var front = patterns.slice( 0, index );
        var back  = patterns.slice( index );

        front.push( PatternFactory.createEmptyPattern( amountOfSteps ));

        // update event offset for back patterns (as their start offset should now shift)

        back.forEach( function( pattern, patternIndex )
        {
            pattern.channels.forEach( function( channel, channelIndex )
            {
                channel.forEach( function( event, eventIndex ) {
                    if ( event ) {
                        ++event.seq.startMeasure;
                        ++event.seq.endMeasure;
                    }
                });
            });
        });
        return front.concat( back );
    },

    /**
     * removes the pattern at given index from given list of patterns
     *
     * @public
     * @param {Array.<PATTERN>} patterns list of patterns
     * @param {number} index where the generated pattern will be added
     * @return {Array.<PATTERN>} updated list
     */
    removePatternAtIndex : function( patterns, index )
    {
        patterns.splice( index, 1 );

        var front = patterns.slice( 0, index);
        var back  = patterns.slice( index );

        // update event offset for back pattern (as it has now shifted)

        back.forEach( function( pattern, patternIndex )
        {
            pattern.channels.forEach( function( channel, channelIndex )
            {
                channel.forEach( function( event, eventIndex ) {
                    if ( event ) {
                        --event.seq.startMeasure;
                        --event.seq.endMeasure;
                    }
                });
            });
        });
        return front.concat( back );
    }
};
