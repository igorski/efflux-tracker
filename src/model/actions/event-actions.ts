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
import type { Store } from "vuex";
import EventFactory from "@/model/factories/event-factory";
import { type EffluxAudioEvent, ACTION_IDLE, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { type EffluxChannelEntry } from "@/model/types/channel";
import { type EffluxSong, EffluxSongType } from "@/model/types/song";
import type { EffluxState } from "@/store";
import EventUtil from "@/utils/event-util";

export function createNoteOffEvent( channelIndex: number ): EffluxAudioEvent {
    return EventFactory.create( channelIndex, "", 0, ACTION_NOTE_OFF );
}

/**
 * Inserting an event is a two-step process:
 * 
 * 1. It needs to be inserted into the correct pattern channel so it becomes part of the song.
 *
 * 2. It needs to calculate its position in relation to the pattern (so the sequencer can enqueue it properly
 * when reading the events in the patterns channels). 
 */
export function insertEvent( event: EffluxAudioEvent, song: EffluxSong, patternIndex: number, channelIndex: number, step: number ): void {
    const pattern = song.patterns[ patternIndex ];
    EventUtil.setPosition( event, pattern, step, song.meta.tempo );
    Vue.set( pattern.channels[ channelIndex ], step, event );
}

/**
 * Making changes to the contents of a pattern while the sequencer is running
 * requires invalidation of caches when applicable (for instance, when looping the pattern that
 * is being changed, the cache needs to be updated to reflect the new contents).
 */
export function invalidateCache( store: Store<EffluxState>, song: EffluxSong, channelIndex: number ): void {
    if ( song.type === EffluxSongType.JAM ) {
        store.commit( "flushJamChannel", channelIndex );
    }
    store.commit( "invalidateChannelCache", { song });
}

/**
 * Tests whether given event is non-existent or consists only of an parameter automation
 */
export function nonExistentOrAutomationOnly( event?: EffluxChannelEntry ): boolean {
    if ( !event ) {
        return true;
    }
    return !!event.mp && event.action === ACTION_IDLE;
}