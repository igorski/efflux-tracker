import { describe, it, expect, vi } from "vitest";
import store, { createMidiState } from "@/store/modules/midi-module";
import type { EffluxState } from "@/store";

const { getters, mutations }  = store;

describe( "Vuex MIDI module", () => {
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
    });
});
