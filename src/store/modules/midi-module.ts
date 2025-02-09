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
import type { Module, ActionContext } from "vuex";
import { zMIDI } from "zmidi";
import type { PairableParam } from "@/services/midi-service";
import StorageUtil from "@/utils/storage-util";

export const PAIRING_STORAGE_KEY = "Efflux_MidiPairing_";

export type MIDIPairingPreset = {
    id: number;
    title: string;
    deviceId: string;
    deviceName: string;
    pairings: { ccid: string, param: PairableParam }[];
};

type MIDIDevice = {
    id: string;
    title: string;
    port: number;
};

export interface MIDIState {
    midiSupported: boolean; // whether we can use MIDI
    midiConnected: boolean; // whether zMIDI has established a MIDI API connection
    midiPortNumber: number; // MIDI port that we have subscribed to receive events from
    midiDeviceList: MIDIDevice[], // list of connected MIDI devices
    midiAssignMode: boolean; // when true, assignable-range-control activate pairing mode
    pairingProps: Partial<PairableParam> | null; // when set, the next incoming CC change will map to this param-instrument pair
    pairings: Map<string, PairableParam>; // list of existing CC changes mapped to param-instrument pairs
};

export const createMidiState = ( props?: Partial<MIDIState> ): MIDIState => ({
    midiSupported: zMIDI.isSupported(),
    midiConnected: false,
    midiPortNumber: -1,
    midiDeviceList: [],
    midiAssignMode: false,
    pairingProps: null,
    pairings: new Map(),
    ...props
});

async function retrievePresets(): Promise<MIDIPairingPreset[]> {
    try {
        const serializedItems = await StorageUtil.getItem( PAIRING_STORAGE_KEY );
        if ( !serializedItems ) {
            return [];
        }
        return JSON.parse( serializedItems );
    } catch {
        return [];
    }
}

function persistPresets( data: MIDIPairingPreset[] = []): Promise<void> {
    return StorageUtil.setItem( PAIRING_STORAGE_KEY, JSON.stringify( data ));
}

const MIDIModule: Module<MIDIState, any> = {
    state: (): MIDIState => createMidiState(),
    getters: {
        hasMidiSupport( state: MIDIState ): boolean {
            return state.midiSupported;
        },
        connectedDevice( state: MIDIState ): MIDIDevice | undefined {
            return state.midiDeviceList.find(({ port }) => port === state.midiPortNumber );
        },
        pairings: ( state: MIDIState ): Map<string, PairableParam> => state.pairings,
    },
    mutations: {
        setMidiPortNumber( state: MIDIState, value: number ): void {
            state.midiPortNumber = value;
        },
        createMidiDeviceList( state: MIDIState, inputs: WebMidi.MIDIInput[] ): void {
            state.midiConnected  = true;
            state.midiDeviceList = inputs.map(( input, i ) => ({
                id    : input.id,
                title : `${input.manufacturer} ${input.name}`,
                port  : i,
            }));
        },
        setMidiAssignMode( state: MIDIState, value: boolean ): void {
            state.midiAssignMode = value;
        },
        setPairingProps( state: MIDIState, pairingProps: Partial<PairableParam> ): void {
            state.pairingProps = pairingProps;
        },
        pairControlChangeToController( state: MIDIState, controlChangeId: string ): void {
            state.pairings.set( controlChangeId, state.pairingProps as PairableParam );
            state.pairingProps = null;
        },
        unpairControlChange( state: MIDIState, controlChangeId: string ): void {
            state.pairings.delete( controlChangeId );
        },
        clearPairings( state: MIDIState ): void {
            state.pairings.clear();
        },
        pairFromPreset( state: MIDIState, preset: MIDIPairingPreset ): void {
            state.pairings.clear();
            preset.pairings.forEach(({ ccid, param }) => {
                state.pairings.set( ccid, param );
            });
        },
    },
    actions: {
        loadPairings(): Promise<MIDIPairingPreset[]> {
            StorageUtil.init();
            return retrievePresets();
        },
        async savePairing( context: ActionContext<MIDIState, any>, presetName: string ): Promise<boolean> {
            const { state, getters } = context;
            const pairings = await retrievePresets();
            const device   = getters.connectedDevice;
       
            if ( !device ) {
                return false;
            }
       
            const preset: MIDIPairingPreset = {
                id: pairings.length + 1,
                title: presetName,
                deviceId: device.id,
                deviceName: device.title,
                pairings: [ ...state.pairings ].map(([ ccid, param ]) => ({ ccid, param })),
            };
            await persistPresets([ ...pairings, preset ]);

            return true;
        },
        async deletePairing( _context: ActionContext<MIDIState, any>, pairing: MIDIPairingPreset ): Promise<void> {
            const pairings = await retrievePresets();
            const index = pairings.findIndex( comparePairing => comparePairing.id === pairing.id );
            if ( index === -1 ) {
                return;
            }
            pairings.splice( index, 1 );
            return persistPresets( pairings );
        },
    },
};
export default MIDIModule;
