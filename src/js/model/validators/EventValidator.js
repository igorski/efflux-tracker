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

module.exports =
{
    /**
     * queries whether given Object is a valid event.
     *
     * @see EventFactory
     *
     * @public
     * @param {AUDIO_EVENT} event
     * @return {boolean}
     */
    isValid( event )
    {
        if ( !event )
            return false;

        if ( event.mp ) {

            if ( typeof event.mp.module !== "string" ||
                 typeof event.mp.value  !== "number" ||
                 typeof event.mp.glide  !== "boolean" ) {

                return false; // invalid module parameter format
            }
        }

        return ( !event.id || typeof event.id === "number" ) // optional

               && typeof event.instrument=== "number"
               && typeof event.note      === "string"
               && typeof event.octave    === "number"
               && typeof event.action    === "number"
               && typeof event.recording === "boolean"
               && (
                   typeof event.seq              === "object"  &&
                   typeof event.seq.playing      === "boolean" &&
                   typeof event.seq.startMeasure === "number"  &&
                   typeof event.seq.endMeasure   === "number"  &&
                   typeof event.seq.length       === "number"  &&
                   typeof event.seq.mpLength     === "number"
               );
    },

    /**
     * verify whether given AudioEvent has content
     *
     * @public
     * @param {AUDIO_EVENT} audioEvent
     * @return {boolean}
     */
    hasContent( audioEvent )
    {
        return (
            typeof audioEvent.instrument === "number" && audioEvent.instrument  >= 0 &&
            typeof audioEvent.note       === "string" && audioEvent.note.length > 0 &&
            typeof audioEvent.octave     === "number" && audioEvent.octave > 0 && audioEvent.octave <= 8
        );
    }
};
