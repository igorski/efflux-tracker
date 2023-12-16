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
import Vue from "vue";
import { type IUndoRedoState } from "@/model/factories/history-state-factory";
import { ACTION_AUTO_ONLY } from "@/model/types/audio-event";
import { type EffluxSong } from "@/model/types/song";
import { clone } from "@/utils/object-util";

export default function( song: EffluxSong, patternIndex: number, channelIndex: number ): IUndoRedoState {
    const orgContent = clone( song.patterns[ patternIndex ].channels[ channelIndex ]);

    function act(): void {
        const channel = song.patterns[ patternIndex ].channels[ channelIndex ];
        for ( let i = 0, l = channel.length; i < l; ++i ) {
            const event = channel[ i ];
            if ( !event ) {
                continue;
            }
            if ( event.action === ACTION_AUTO_ONLY ) {
                Vue.set( channel, i, 0 );
            } else {
                Vue.set( event, "mp", undefined );
            }
        }
    }
    act(); // perform action

    return {
        undo(): void {
            Vue.set( song.patterns[ patternIndex ].channels, channelIndex, clone( orgContent ));
        },
        redo: act
    };
}