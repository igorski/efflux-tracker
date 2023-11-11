/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
import Vue from "vue";
import EventFactory from "@/model/factories/event-factory";
import { type EffluxAudioEvent, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { type EffluxSong } from "@/model/types/song";
import EventUtil from "@/utils/event-util";

export function createNoteOffEvent( channelIndex: number ): EffluxAudioEvent {
    return EventFactory.create( channelIndex, "", 0, ACTION_NOTE_OFF );
}

export function insertEvent( event: EffluxAudioEvent, song: EffluxSong, patternIndex: number, channelIndex: number, step: number ): void {
    const pattern = song.patterns[ patternIndex ];
    EventUtil.setPosition( event, pattern, step, song.meta.tempo );
    Vue.set( pattern.channels[ channelIndex ], step, event );
}
