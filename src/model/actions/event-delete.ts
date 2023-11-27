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
import type { Store } from "vuex";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import { type EffluxChannelEntry } from "@/model/types/channel";
import type { EffluxState } from "@/store";
import EventUtil from "@/utils/event-util";

export default function( store: Store<EffluxState>, event?: EffluxChannelEntry ): IUndoRedoState {
    const song               = store.state.song.activeSong,
          activePattern      = store.getters.activePatternIndex,
          selectedInstrument = store.state.editor.selectedInstrument,
          selectedStep       = store.state.editor.selectedStep;

    if ( event === undefined ) {
        event = song.patterns[ activePattern ].channels[ selectedInstrument ][ selectedStep ];
    }

    // if a selection is set, store its state for redo purposes

    const selection            = store.getters.getSelection({ song, activePattern });
    const hadSelection         = selection.length > 0;
    const selectedFirstChannel = store.state.selection.firstSelectedChannel;
    const selectedLastChannel  = store.state.selection.lastSelectedChannel;
    const selectedMinStep      = store.state.selection.minSelectedStep;
    const selectedMaxStep      = store.state.selection.maxSelectedStep;

    const { commit } = store;

    function act( optSelection: any[] ): void {
        if ( hadSelection ) {
            // pass selection when redoing a delete action on a selection
            commit( "deleteSelection", {
                song, activePattern,
                optSelectionContent: optSelection, optFirstSelectedChannel: selectedFirstChannel,
                optLastSelectedChannel: selectedLastChannel, optMinSelectedStep: selectedMinStep, optMaxSelectedStep: selectedMaxStep
            });
        }
        else {
            EventUtil.clearEvent(
                song,
                activePattern,
                selectedInstrument,
                selectedStep,
            );
        }
    }

    // delete the event(s)
    act( selection );

    return {
        undo(): void {
            if ( hadSelection ) {
                commit( "pasteSelection", {
                    song, activePattern, selectedInstrument, selectedStep, optSelectionContent: selection
                });
            }
            else {
                commit( "addEventAtPosition", {
                    event,
                    store,
                    optData: {
                        patternIndex: activePattern,
                        channelIndex: selectedInstrument,
                        step: selectedStep
                    },
                    optStoreInUndoRedo: false // prevents storing in undo/redo again, kinda important!
                });
            }
        },
        redo() {
            act( selection );
        }
    };
}
