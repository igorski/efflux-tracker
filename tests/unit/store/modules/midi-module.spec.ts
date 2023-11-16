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

        it( "should know whether at least one pairing has been mapped", () => {
            const state = createMidiState();
            expect( getters.hasPairings( state )).toBe( false );

            state.pairings.set( "foo", "bar" );

            expect( getters.hasPairings( state )).toBe( true );
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
                { manufacturer: "Acme", name : "foo" },
                { manufacturer: "Acme", name : "bar" }
            ]);
            expect( state.midiDeviceList ).toEqual([
                { title: "Acme foo", value: 0 },
                { title: "Acme bar", value: 1 }
            ]);
        });

        it( "should be able to set the controller assignment mode", () => {
            const state = createMidiState({ midiAssignMode: false });
            mutations.setMidiAssignMode( state, true );
            expect( state.midiAssignMode ).toBe( true );
        });

        it( "should be able to enqueue a param/instrument mapping to be paired with a CC change", () => {
            const state = createMidiState({
                pairableParamId : null,
                midiAssignMode  : true
            });
            const pairableParamId = { paramId: "bar", instrumentIndex: 2 };
            mutations.setPairableParamId( state, pairableParamId );
            expect( state.pairableParamId ).toEqual( pairableParamId );
            expect( state.midiAssignMode ).toBe( false );
        });

        it( "should be able to pair a CC change to an enqueued param/instrument mapping", () => {
            const pairableParamId = { paramId: "bar", instrumentIndex: 2 };
            const state = createMidiState({
                pairableParamId,
            });
            mutations.pairControlChangeToController( state, "foo" );
            expect( state.pairings.has( "foo" )).toBe( true );
            expect( state.pairings.get( "foo" )).toEqual( pairableParamId );
            expect( state.pairableParamId ).toBeNull();
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
                device: "Some MIDI device id",
                pairings: [
                    { ccid: "1", param: "baz" },
                    { ccid: "2", param: "qux" },
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

                expect( state.pairings.get( "1" )).toEqual( "baz" );
                expect( state.pairings.get( "2" )).toEqual( "qux" );
            });
        });
    });

    describe( "actions", () => {
        const MOCK_STORED_PRESETS: MIDIPairingPreset[] = [
            {
                id: 1,
                title: "My preset",
                device: "Some MIDI device id",
                pairings: [
                    { ccid: "1", param: "foo" },
                    { ccid: "2", param: "bar" },
                ],
            }, {
                id: 2,
                title: "My other preset",
                device: "Some other MIDI device id",
                pairings: [
                    { ccid: "3", param: "baz" },
                    { ccid: "4", param: "qux" },
                ],
            },
        ];

        beforeEach(() => {
            mockStorageGetItem.mockImplementationOnce(() => Promise.resolve( JSON.stringify( MOCK_STORED_PRESETS )));
        });

        it( "should be able to retrieve the stored presets", async () => {
            // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
            const result = await actions.loadPairings();

            expect( mockStorageFn ).toHaveBeenCalledWith( "init" );
            expect( mockStorageGetItem ).toHaveBeenCalledWith( PAIRING_STORAGE_KEY );
            
            expect( result ).toEqual( MOCK_STORED_PRESETS );
        });

        it( "should be able to save a new pairing to the stored preset list", async () => {
            const state = createMidiState({
                midiPortNumber: 11,
                midiDeviceList: [
                    { title: "Yet another MIDI device id", value: 11 }
                ],
                pairings: new Map([[ "5", "quz" ], [ "6", "corge" ]]),
            });
            const title = "My newest preset";
           
            // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
            await actions.savePairing({ state }, title );

            expect( mockStorageSetItem ).toHaveBeenCalledWith( PAIRING_STORAGE_KEY, JSON.stringify([
                ...MOCK_STORED_PRESETS,
                {
                    id: 3,
                    title,
                    device: state.midiDeviceList[ 0 ].title,
                    pairings: [
                        { ccid: "5", param: "quz" },
                        { ccid: "6", param: "corge" },
                    ],
                }
            ]));
        });

        it( "should be able to remove an individual pairing from the stored preset list", async () => {
            // @ts-expect-error Type 'ActionObject<SettingsState, any>' has no call signatures.
            await actions.deletePairing({}, MOCK_STORED_PRESETS[ 0 ]);

            expect( mockStorageSetItem ).toHaveBeenCalledWith(
                PAIRING_STORAGE_KEY, JSON.stringify([ MOCK_STORED_PRESETS[ 1 ]])
            );
        });
    });
});
