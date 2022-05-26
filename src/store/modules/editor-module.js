/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
import Config from "@/config";
import Actions from "@/definitions/actions";
import createAction from "@/model/factories/action-factory";
import EventUtil from "@/utils/event-util";
import LinkedList from "@/utils/linked-list";

// editor module stores all states of the editor such as
// the instrument which is currently be edited, the active track
// in the currently active pattern, etc.

export default {
    state: {
        /**
         * which instrument is currently selected
         * this is represented in the track list as a column
         * or as the instrument being edited inside the instrument editor
         *
         * as each instrument has its dedicated output channel, this
         * value is also analogous to the currently selected channel
         *
         * @type {number}
         */
        selectedInstrument: 0,

        /**
         * which pattern step is currently selected
         * this is represented in the track list as a row
         *
         * @type {number}
         */
        selectedStep: 0,

        /**
         * which parameter slot within an instruments step
         * is currently selected (e.g. note 0, instrument 1, module parameter 2 or module parameter value 3)
         * -1 indicates no deliberate slot was selected
         * this is represented in the track list as a column within the selected row
         *
         * @type {number}
         */
        selectedSlot: -1,

        /**
         * the root octave of the lower keyboard note range
         *
         * @type {number}
         */
        higherKeyboardOctave: 4,

        /**
         * the root octave of the lower keyboard note range
         *
         * @type {number}
         */
        lowerKeyboardOctave: 2,


        /**
         * the oscillator that is currently being edited
         * in the instrument-editor
         *
         * @type {number}
         */
        selectedOscillatorIndex : 0,

        /**
         * linked list that is used to chain all song pattern
         * events sequentially, used for fast lookup and editing
         *
         * NOTE: the linked list is NOT reactive, do not use
         * Vue.set/delete on its properties.
         */
        eventList: null,

        /**
         * Whether the note entry panel is docked on screen
         */
        showNoteEntry: false,
    },
    mutations: {
        setSelectedInstrument( state, value ) {
            state.selectedInstrument = Math.max( 0, Math.min( Config.INSTRUMENT_AMOUNT - 1, value ));
        },
        setSelectedStep( state, value ) {
            state.selectedStep = Math.max(0, value);
        },
        setSelectedSlot( state, value ) {
            state.selectedSlot = Math.max(-1, Math.min(3, value));
        },
        setHigherKeyboardOctave( state, value ) {
            state.higherKeyboardOctave = value;
        },
        setLowerKeyboardOctave( state, value ) {
            state.lowerKeyboardOctave = value;
        },
        setSelectedOscillatorIndex( state, index ) {
            state.selectedOscillatorIndex = index;
        },
        prepareLinkedList( state ) {
            state.eventList = new Array( Config.INSTRUMENT_AMOUNT );

            for ( let i = 0; i < Config.INSTRUMENT_AMOUNT; ++i ) {
                state.eventList[ i ] = new LinkedList();
            }
        },
        createLinkedList( state, song ) {
            EventUtil.linkEvents( song.patterns, state.eventList );
        },
        setShowNoteEntry( state, value ) {
            state.showNoteEntry = value;
        },
        resetEditor( state ) {
            state.selectedInstrument = 0;
            state.selectedStep       = 0;
        },
    },
    actions: {
        async pastePatternsIntoSong( storeRef, { patterns, insertIndex = -1 }) {
            storeRef.commit( "saveState",
                createAction( Actions.PASTE_PATTERN_MULTIPLE, {
                    store: storeRef,
                    patterns,
                    insertIndex
                })
            );
        }
    }
};
