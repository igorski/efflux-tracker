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
import { type Store } from "vuex";
import { type IUndoRedoState } from "@/model/factories/history-state-factory";
import { type EffluxAudioEvent } from "@/model/types/audio-event";
import { type EffluxChannelEntry } from "@/model/types/channel";
import { type EffluxState } from "@/store";

export default function deleteEventParamAutomation( store: Store<EffluxState>, patternIndex: number, channelIndex: number, step: number ): IUndoRedoState {
    const existingEvent = getEvent( store, patternIndex, channelIndex, step );
    if ( !existingEvent ) {
        throw new Error( "cannot delete param automation from non-existing event" );
    }
    const existingAutomation = existingEvent.mp ? { ...existingEvent.mp } : undefined;
    
    const act = (): void => {
        const event = getEvent( store, patternIndex, channelIndex, step ) as EffluxAudioEvent;
        event.mp = undefined;
    };
    act(); // perform action

    return {
        undo(): void {
            const event = getEvent( store, patternIndex, channelIndex, step ) as EffluxAudioEvent;
            event.mp = { ...existingAutomation };
        },
        redo: act
    };
}

/* internal methods */

function getEvent( store: Store<EffluxState>, patternIndex: number, channelIndex: number, step: number ): EffluxChannelEntry {
    return store.state.song.activeSong.patterns[ patternIndex ].channels[ channelIndex ][ step ];
}
