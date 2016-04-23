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
module.exports =
{
    /**
     * update the position properties of given AudioEvent
     *
     * @public
     * @param {AUDIO_EVENT} audioEvent
     * @param {PATTERN} pattern
     * @param {number} patternNum index of the pattern within the entire Song (e.g. "measure")
     * @param {number} patternStep index of the audioEvent within the pattern
     * @param {number} tempo in BPM of the song
     * @param {number=} length optional duration (in seconds) of the audioEvent, defaults to
     *                  the smallest unit available for given patterns length
     */
    setPosition : function( audioEvent, pattern, patternNum, patternStep, tempo, length )
    {
        var measureLength = ( 60 / tempo ) * 4; // TODO: the 4 is implying 4/4 time
        var eventOffset   = ( patternStep / pattern.steps ) * measureLength;

        audioEvent.seq.length             = ( typeof length === "number" ) ? length : ( 1 / pattern.steps ) * measureLength;
        audioEvent.seq.startMeasure       = patternNum;
        audioEvent.seq.startMeasureOffset = eventOffset;
        audioEvent.seq.endMeasure         = patternNum + Math.abs( Math.ceil((( eventOffset + length ) - measureLength ) / measureLength ));
    },

    /**
     * verify whether given AudioEvent is valid (e.g. has content)
     *
     * @public
     * @param {AUDIO_EVENT} audioEvent
     * @return {boolean}
     */
    isValid : function( audioEvent )
    {
        return (
            typeof audioEvent.instrument === "number" && audioEvent.instrument  >= 0 &&
            typeof audioEvent.note       === "string" && audioEvent.note.length > 0 &&
            typeof audioEvent.octave     === "number" && audioEvent.octave > 0 && audioEvent.octave <= 8
        );
    }
};
