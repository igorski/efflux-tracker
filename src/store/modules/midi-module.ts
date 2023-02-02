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
import type { Module } from "vuex";
import { zMIDI } from "zmidi";

type MIDIDevice = {
    title: string;
    value: number;
};

type PairableParam = {
    paramId: string;
    instrumentIndex: number;
};

export interface MIDIState {
    midiSupported: boolean;
    midiConnected: boolean;
    midiPortNumber: number;
    midiDeviceList: MIDIDevice[],
    midiAssignMode: boolean;
    pairableParamId: PairableParam | null;
    pairings: Map<string, PairableParam>;
};

const MIDIModule: Module<MIDIState, any> = {
    state: (): MIDIState => ({
        midiSupported   : zMIDI.isSupported(), // can we use MIDI ?
        midiConnected   : false,    // whether zMIDI has established a MIDI API connection
        midiPortNumber  : -1,       // midi port that we have subscribed to receive events from
        midiDeviceList  : [],       // list of connected MIDI devices
        midiAssignMode  : false,    // when true, assignable-range-control activate pairing mode
        // { paramId: String, instrumentIndex: Number }
        pairableParamId : null,     // when set, the next incoming CC change will map to this param-instrument pair
        pairings        : new Map() // list of existing CC changes mapped to param-instrument pairs
    }),
    getters: {
        hasMidiSupport( state: MIDIState ): boolean {
            return state.midiSupported;
        },
    },
    mutations: {
        setMidiPortNumber( state: MIDIState, value: number ): void {
            state.midiPortNumber = value;
        },
        createMidiDeviceList( state: MIDIState, inputs: WebMidi.MIDIInput[] ): void {
            state.midiConnected  = true;
            state.midiDeviceList = inputs.map(( input, i ) => ({
                title : `${input.manufacturer} ${input.name}`,
                value : i,
            }));
        },
        setMidiAssignMode( state: MIDIState, value: boolean ): void {
            state.midiAssignMode = value;
        },
        setPairableParamId( state: MIDIState, pairableParamId: PairableParam ): void {
            state.pairableParamId = pairableParamId;
            state.midiAssignMode  = false;
        },
        pairControlChangeToController( state: MIDIState, controlChangeId: string ): void {
            state.pairings.set( controlChangeId, state.pairableParamId! );
            state.pairableParamId = null;
        },
        unpairControlChange( state: MIDIState, controlChangeId: string ): void {
            state.pairings.delete( controlChangeId );
        },
        clearPairings( state: MIDIState ): void {
            state.pairings.clear();
        },
    }
};
export default MIDIModule;
