import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import store, { createMidiState, PAIRING_STORAGE_KEY, type MIDIPairingPreset } from "@/store/modules/midi-module";
import type { EffluxState } from "@/store";

const { getters, mutations, actions }  = store;

let mockStorageFn = vi.fn();
const mockStorageGetItem = vi.fn();
const mockStorageSetItem = vi.fn();
vi.mock( "@/utils/storage-util", () => ({
    default: {
        init: vi.fn(( ...args ) => Promise.resolve( mockStorageFn( "init", ...args ))),
        getItem: vi.fn(( ...args ) => mockStorageGetItem( ...args )),
        setItem: vi.fn(( ...args ) => mockStorageSetItem( ...args )),
    }
}));

describe( "Vuex MIDI module", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe( "getters", () => {
        const mockGetters: any = {};
        const mockRootState: EffluxState = {} as EffluxState;
        const mockRootGetters: any = {};

        it( "should know whether MIDI is supported", () => {
            const state = createMidiState({ midiSupported: false });
            expect( getters.hasMidiSupport( state, mockGetters, mockRootState, mockRootGetters )).toBe( false );

            state.midiSupported = true;
            expect( getters.hasMidiSupport( state, mockGetters, mockRootState, mockRootGetters )).toBe( true );
        });

        it( "should be able to return the currently connected MIDI device from the currently active port number", () => {
            const state = createMidiState({
                midiDeviceList: [
                    { id: "foo", title: "Device 1", port: 3 },
                    { id: "bar", title: "Device 2", port: 2 },
                    { id: "baz", title: "Device 3", port: 1 },
                ],
                midiPortNumber: 1,
            });
            expect( getters.connectedDevice( state, getters, {}, {} )).toEqual( state.midiDeviceList[ 2 ]);
        });

        it( "should be able to return the pairings Map", () => {
            const state = createMidiState();
            expect( getters.pairings( state, getters, {}, {} )).toEqual( state.pairings );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the MIDI port number", () => {
            const state = createMidiState({ midiPortNumber: 0 });
            mutations.setMidiPortNumber( state, 1);
            expect( state.midiPortNumber ).toEqual(1);
        });

        it( "should be able to format a MIDI connection list", () => {
            const state = createMidiState({ midiDeviceList: [] });
            mutations.createMidiDeviceList( state, [
                { id: "abc", manufacturer: "Acme", name : "foo" },
                { id: "cde", manufacturer: "Acme", name : "bar" }
            ]);
            expect( state.midiDeviceList ).toEqual([
                { id: "abc", title: "Acme foo", port: 0 },
                { id: "cde", title: "Acme bar", port: 1 }
            ]);
        });

        it( "should be able to set the controller assignment mode", () => {
            const state = createMidiState({ midiAssignMode: false });
            mutations.setMidiAssignMode( state, true );
            expect( state.midiAssignMode ).toBe( true );
        });

        it( "should be able to enqueue a param/instrument mapping to be paired with a CC change", () => {
            const state = createMidiState({
                pairingProps   : null,
                midiAssignMode : true
            });
            const pairingProps = { paramId: "bar", instrumentIndex: 2, optData: 1 };
            mutations.setPairingProps( state, pairingProps );
            expect( state.pairingProps ).toEqual( pairingProps );
        });

        it( "should be able to pair a CC change to an enqueued param/instrument mapping", () => {
            const pairingProps = { paramId: "bar", instrumentIndex: 2, optData: 1 };
            const state = createMidiState({
                pairingProps,
            });
            mutations.pairControlChangeToController( state, "foo" );
            expect( state.pairings.has( "foo" )).toBe( true );
            expect( state.pairings.get( "foo" )).toEqual( pairingProps );
            expect( state.pairingProps ).toBeNull();
        });

        it( "should be able to unpair an existing control change", () => {
            const state = createMidiState();

            state.pairings.set( "foo", { paramId: "foo", instrumentIndex: 0 } );
            state.pairings.set( "bar", { paramId: "bar", instrumentIndex: 1 } );

            mutations.unpairControlChange( state, "foo" );

            expect( state.pairings.has( "foo" )).toBe( false );
            expect( state.pairings.has( "bar" )).toBe( true );
        });

        it( "should be able to clear all mapped controller pairings", () => {
            const state = createMidiState();
            const clearSpy = vi.spyOn( state.pairings, "clear" );

            mutations.clearPairings( state );
            expect( clearSpy ).toHaveBeenCalled();
        });

        describe( "when restoring pairings from a saved preset", () => {
            const preset: MIDIPairingPreset = {
                id: 1,
                title: "My preset",
                deviceId: "Some MIDI device id",
                deviceName: "Some MIDI device",
                pairings: [
                    { ccid: "1", param: { paramId: "foo", instrumentIndex: 1, optData: 2 } },
                    { ccid: "2", param: { paramId: "bar", instrumentIndex: 2 } },
                ],
            };

            it( "should clear the existing pairings", () => {
                const state = createMidiState();

                state.pairings.set( "foo", { paramId: "foo", instrumentIndex: 0 } );
                state.pairings.set( "bar", { paramId: "bar", instrumentIndex: 1 } );

                mutations.pairFromPreset( state, preset );

                expect( state.pairings.has( "foo" )).toBe( false );
                expect( state.pairings.has( "bar" )).toBe( false );
            });

            it( "should set the stored pairings", () => {
                const state = createMidiState();

                mutations.pairFromPreset( state, preset );

                expect( state.pairings.get( "1" )).toEqual({ paramId: "foo", instrumentIndex: 1, optData: 2 });
                expect( state.pairings.get( "2" )).toEqual({ paramId: "bar", instrumentIndex: 2 });
            });
        });
    });

    describe( "actions", () => {
        const MOCK_STORED_PRESETS: MIDIPairingPreset[] = [
            {
                id: 1,
                title: "My preset",
                deviceId: "Some MIDI device id",
                deviceName: "Some MIDI device",
                pairings: [
                    { ccid: "1", param: { paramId: "foo", instrumentIndex: 0  }},
                    { ccid: "2", param: { paramId: "bar", instrumentIndex: 0  }},
                ],
            }, {
                id: 2,
                title: "My other preset",
                deviceId: "Some other MIDI device id",
                deviceName: "Some other MIDI device",
                pairings: [
                    { ccid: "3", param: { paramId: "baz", instrumentIndex: 0  }},
                    { ccid: "4", param: { paramId: "qux", instrumentIndex: 0  }},
                ],
            },
        ];

        beforeEach(() => {
            mockStorageGetItem.mockImplementationOnce(() => Promise.resolve( JSON.stringify( MOCK_STORED_PRESETS )));
        });

        it( "should be able to retrieve the stored presets", async () => {
            // @ts-expect-error Not all constituents of type 'Action<MidiState, any>' are callable
            const result = await actions.loadPairings();

            expect( mockStorageFn ).toHaveBeenCalledWith( "init" );
            expect( mockStorageGetItem ).toHaveBeenCalledWith( PAIRING_STORAGE_KEY );
            
            expect( result ).toEqual( MOCK_STORED_PRESETS );
        });

        it( "should be able to save a new pairing to the stored preset list", async () => {
            const state = createMidiState({
                midiPortNumber: 11,
                midiDeviceList: [
                    { id: "abc", title: "Yet another MIDI device id", port: 11 }
                ],
                pairings: new Map([
                    [ "5", { paramId: "quz",   instrumentIndex: 0  }],
                    [ "6", { paramId: "corge", instrumentIndex: 0 }]
                ]),
            });
            const getters = {
                connectedDevice: state.midiDeviceList[ 0 ],
            };
            const title = "My newest preset";
           
            // @ts-expect-error Not all constituents of type 'Action<MidiState, any>' are callable
            const result = await actions.savePairing({ state, getters }, title );

            expect( mockStorageSetItem ).toHaveBeenCalledWith( PAIRING_STORAGE_KEY, JSON.stringify([
                ...MOCK_STORED_PRESETS,
                {
                    id: 3,
                    title,
                    deviceId: getters.connectedDevice.id,
                    deviceName: getters.connectedDevice.title,
                    pairings: [
                        { ccid: "5", param: { paramId: "quz",   instrumentIndex: 0 }},
                        { ccid: "6", param: { paramId: "corge", instrumentIndex: 0 }},
                    ],
                }
            ]));
            expect( result ).toBe( true );
        });

        it( "should be able to remove an individual pairing from the stored preset list", async () => {
            // @ts-expect-error Not all constituents of type 'Action<MidiState, any>' are callable
            await actions.deletePairing({}, MOCK_STORED_PRESETS[ 0 ]);

            expect( mockStorageSetItem ).toHaveBeenCalledWith(
                PAIRING_STORAGE_KEY, JSON.stringify([ MOCK_STORED_PRESETS[ 1 ]])
            );
        });
    });
});
