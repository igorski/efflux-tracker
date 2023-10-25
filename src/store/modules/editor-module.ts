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
import type { ActionContext, Module } from "vuex";
import Config from "@/config";
import pasteMultiplePatterns from "@/model/actions/pattern-paste-multiple";
import type { EffluxPattern } from "@/model/types/pattern";

export interface EditorState {
    /**
     * which instrument is currently selected
     * this is represented in the track list as a column
     * or as the instrument being edited inside the instrument editor
     *
     * as each instrument has its dedicated output channel, this
     * value is also analogous to the currently selected channel
     */
    selectedInstrument: number;
    /**
     * which pattern step is currently selected
     * this is represented in the track list as a row
     */
    selectedStep: number;
    /**
     * which parameter slot within an instruments step
     * is currently selected (e.g. note 0, instrument 1, module parameter 2 or module parameter value 3)
     * -1 indicates no deliberate slot was selected
     * this is represented in the track list as a column within the selected row
     */
    selectedSlot: number;
    higherKeyboardOctave: number; // the root octave of the higher keyboard note range
    lowerKeyboardOctave: number; // the root octave of the lower keyboard note range
    /**
     * the oscillator that is currently being edited
     * in the instrument-editor
     */
    selectedOscillatorIndex: number;
    showNoteEntry: boolean; // whether the note entry panel is docked on screen
};

export const createEditorState = ( props?: Partial<EditorState> ): EditorState => ({
    selectedInstrument: 0,
    selectedStep: 0,
    selectedSlot: -1,
    higherKeyboardOctave: 4,
    lowerKeyboardOctave: 2,
    selectedOscillatorIndex: 0,
    showNoteEntry: false,
    ...props
});

// editor module stores all states of the editor such as
// the instrument which is currently be edited, the active track
// in the currently active pattern, etc.

const EditorModule: Module<EditorState, any> = {
    state: (): EditorState => createEditorState(),
    mutations: {
        setSelectedInstrument( state: EditorState, value: number ): void {
            state.selectedInstrument = Math.max( 0, Math.min( Config.INSTRUMENT_AMOUNT - 1, value ));
        },
        setSelectedStep( state: EditorState, value: number ): void {
            state.selectedStep = Math.max( 0, value );
        },
        setSelectedSlot( state: EditorState, value: number ): void {
            state.selectedSlot = Math.max( -1, Math.min( 3, value ));
        },
        setHigherKeyboardOctave( state: EditorState, value: number ): void {
            state.higherKeyboardOctave = value;
        },
        setLowerKeyboardOctave( state: EditorState, value: number ): void {
            state.lowerKeyboardOctave = value;
        },
        setSelectedOscillatorIndex( state: EditorState, index: number ): void {
            state.selectedOscillatorIndex = index;
        },
        setShowNoteEntry( state: EditorState, value: boolean ): void {
            state.showNoteEntry = value;
        },
        resetEditor( state: EditorState ): void {
            state.selectedInstrument = 0;
            state.selectedStep       = 0;
        },
    },
    actions: {
        async pastePatternsIntoSong( context: ActionContext<EditorState, any>,
            { patterns, insertIndex }: { patterns: EffluxPattern[], insertIndex?: number }): Promise<void> {
            context.commit( "saveState",
                pasteMultiplePatterns( context, patterns, insertIndex )
            );
        }
    }
};
export default EditorModule;
