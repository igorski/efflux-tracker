/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
import { type EffluxAudioEvent, ACTION_IDLE, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { type EffluxChannel } from "@/model/types/channel";
import { type EffluxPattern } from "@/model/types/pattern";

export const listChannel = ( channel: EffluxChannel ): string => {
    return JSON.stringify(
        channel.map(( event: EffluxAudioEvent ) => {
            if ( !event ) {
                return "empty";
            }
            if ( event.action === ACTION_IDLE && !!event.mp ) {
                return "mp";
            }
            if ( event.action === ACTION_NOTE_OFF ) {
                return "off";
            }
            return `on:${event.note}${event.octave}`;
        })
    );
};

export const listPattern = ( pattern : EffluxPattern ): string => {
    return pattern.channels.reduce(( acc, channel ) => [ ...acc, listChannel( channel )], [] ).join( "," );
};
