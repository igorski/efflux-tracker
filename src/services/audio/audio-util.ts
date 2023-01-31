/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
import type { EventVoice, EventVoiceList } from "@/model/types/event-voice";

type voiceProcessHandler = ( EventVoice, number ) => void;

/**
 * utility method to process all the voices within an instruments
 * playing event list while performing null checks for safety
 *
 * @param {Array<EventVoiceList>} instrumentEvents events currently playing back for this instrument
 * @param {!Function} fn function to execute on each individual voice, will receive
 *                    EventVoice and oscillator index as its arguments
 */
export const processVoices = ( instrumentEvents: EventVoiceList[], fn: voiceProcessHandler ): void => {
    let i, j, eventVoices, voice;
    i = instrumentEvents.length;

    while ( i-- ) {
        eventVoices = instrumentEvents[ i ];

        if ( !eventVoices ) {
            continue;
        }

        j = eventVoices.length;

        while ( j-- ) {
            voice = eventVoices[ j ];

            // voices can be undefined as they are listed by their oscillator index
            // while it is possible not all oscillators are enabled for an instrument

            if ( !voice ) {
                continue;
            }
            fn( voice, j );
        }
    }
};
