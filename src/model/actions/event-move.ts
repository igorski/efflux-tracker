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
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import { type EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxState } from "@/store";
import EventUtil from "@/utils/event-util";

type IUpdateHandler = ( advanceStep?: boolean ) => void;

export default function( store: Store<EffluxState>,
    { patternIndex, channelIndex, oldStep, newStep, optProps } :
    { patternIndex: number, channelIndex: number, oldStep: number, newStep: number, optProps: Partial<EffluxAudioEvent>}): IUndoRedoState
{
    const { state } = store;
    const song = state.song.activeSong;

    const orgEvent = song.patterns[ patternIndex ].channels[ channelIndex ][ oldStep ];
    const existing = song.patterns[ patternIndex ].channels[ channelIndex ][ newStep ];
    const newEvent = { ...orgEvent, ...optProps };

    function act(): void {
        const pattern = song.patterns[ patternIndex ];

        EventUtil.clearEvent( song, patternIndex, channelIndex, oldStep );
        EventUtil.setPosition( newEvent, pattern, newStep, song.meta.tempo );

        Vue.set( song.patterns[ patternIndex ].channels[ channelIndex ], newStep, newEvent );
        store.commit( "invalidateChannelCache", { song });
    }
    act(); // perform action

    return {
        undo(): void {
            const pattern = song.patterns[ patternIndex ];

            EventUtil.clearEvent( song, patternIndex, channelIndex, newStep );

            EventUtil.setPosition( orgEvent, pattern, oldStep, song.meta.tempo );
            Vue.set( song.patterns[ patternIndex ].channels[ channelIndex ], oldStep, orgEvent );

            // in case an event existed at the target position, restore it
            if ( existing ) {
                EventUtil.setPosition( existing, pattern, newStep, song.meta.tempo );
                Vue.set( song.patterns[ patternIndex ].channels[ channelIndex ], newStep, existing );
            }
            store.commit( "invalidateChannelCache", { song });
        },
        redo: act
    };
}
