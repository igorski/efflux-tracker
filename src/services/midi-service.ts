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
import { MIDINotes, zMIDIEvent } from "zmidi";
import type { Store, Commit, Module } from "vuex";
import InstrumentUtil from "../utils/instrument-util";
import type { EffluxState } from "@/store";
import type { MIDIState } from "@/store/modules/midi-module";

const MIDI_TO_PERCENTILE = 1 / 127; // scale MIDI 0-127 range to percentile

let store: Store<EffluxState>;
let state: any;
let getters: any;
let commit: Commit;
let midi: MIDIState;

export default {
    init( storeReference: Store<EffluxState> ): void {
        store = storeReference;
        ({ state, getters, commit } = store );
        ({ midi } = state ); // midi-module
    },

    /**
     * MIDI message handler (received via zMIDI library)
     * this method is bound to the store state
     *
     * @param {zMIDIEvent} event
     */
    handleMIDIMessage({ type, value, number, channel }: { type: number, value: number, number: number, channel: number }): void {
        const pitch = MIDINotes.getPitchByNoteNumber( value );
        switch ( type ) {
            default:
                break;

            case zMIDIEvent.NOTE_ON:
                const instrumentIndex = state.editor.selectedInstrument;
                const instrument = state.song.activeSong.instruments[ instrumentIndex ];
                InstrumentUtil.onKeyDown( pitch, instrument, state.sequencer.recording, store );
                break;

            case zMIDIEvent.NOTE_OFF:
                InstrumentUtil.onKeyUp( pitch, store );
                break;

            case zMIDIEvent.CONTROL_CHANGE:
                const on = value >= 64;
                switch ( number ) {
                    default:
                        const controlId = `${channel}_${number}`;
                        if ( midi.pairableParamId ) {
                            commit( "pairControlChangeToController", controlId );
                        } else {
                            const pairing = midi.pairings.get( controlId );
                            if ( pairing ) {
                                InstrumentUtil.onParamControlChange(
                                    pairing.paramId, value * MIDI_TO_PERCENTILE,
                                    pairing.instrumentIndex, state.sequencer.recording, store
                                );
                            }
                        }
                        break;
                    case 44:
                        if ( on ) {
                            commit( "setRecording", !getters.isRecording );
                        }
                        break;
                    case 45:
                        if ( !getters.isPlaying ) {
                            commit( "setPlaying", true );
                        }
                        break;
                    case 46:
                        if ( getters.isPlaying ) {
                            commit( "setPlaying", false );
                        }
                        break;
                    case 47:
                        commit( "gotoPreviousPattern", getters.activeSong );
                        break;
                    case 48:
                        commit( "gotoNextPattern", getters.activeSong );
                        break;
                    case 49:
                        if ( on ) {
                            commit( "setLooping", !getters.isLooping );
                        }
                        break;
                }
                break;
        }
    }
};
