import store from "@/store/modules/midi-module";
const { getters, mutations }  = store;

describe( "Vuex MIDI module", () => {
    describe( "getters", () => {
        it( "should know whether MIDI is supported", () => {
            const state = { midiSupported: false };
            expect( getters.hasMidiSupport( state )).toBe( false );
            state.midiSupported = true;
            expect( getters.hasMidiSupport( state )).toBe( true );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the MIDI port number", () => {
            const state = { midiPortNumber: 0 };
            mutations.setMidiPortNumber( state, 1);
            expect( state.midiPortNumber ).toEqual(1);
        });

        it( "should be able to format a MIDI connection list", () => {
            const state = { midiDeviceList: [] };
            mutations.createMidiDeviceList( state, [
                { manufacturer: "Acme", name : "foo" },
                { manufacturer: "Acme", name : "bar" }
            ]);
            expect(state.midiDeviceList).toEqual([
                { title: "Acme foo", value: 0 },
                { title: "Acme bar", value: 1 }
            ]);
        });

        it( "should be able to set the controller assignment mode", () => {
            const state = { midiAssignMode: false };
            mutations.setMidiAssignMode( state, true );
            expect( state.midiAssignMode ).toBe( true );
        });

        it( "should be able to enqueue a param/instrument mapping to be paired with a CC change", () => {
            const state = {
                pairableParamId : null,
                midiAssignMode  : true
            };
            const pairableParamId = { paramId: "bar", instrumentIndex: 2 };
            mutations.setPairableParamId( state, pairableParamId );
            expect( state.pairableParamId ).toEqual( pairableParamId );
            expect( state.midiAssignMode ).toBe( false );
        });

        it( "should be able to pair a CC change to an enqueued param/instrument mapping", () => {
            const pairableParamId = { paramId: "bar", instrumentIndex: 2 };
            const state = {
                pairings : new Map(),
                pairableParamId,
            };
            mutations.pairControlChangeToController( state, "foo" );
            expect( state.pairings.has( "foo" )).toBe( true );
            expect( state.pairings.get( "foo" )).toEqual( pairableParamId );
            expect( state.pairableParamId ).toBeNull();
        });

        it( "should be able to unpair an existing control change", () => {
            const state = {
                pairings: new Map()
            };
            state.pairings.set( "foo", jest.fn() );
            state.pairings.set( "bar", jest.fn() );
            mutations.unpairControlChange( state, "foo" );
            expect( state.pairings.has( "foo" )).toBe( false );
            expect( state.pairings.has( "bar" )).toBe( true );
        });

        it( "should be able to clear all mapped controller pairings", () => {
            const state = {
                pairings: { clear: jest.fn() }
            };
            mutations.clearPairings( state );
            expect( state.pairings.clear ).toHaveBeenCalled();
        });
    });
});
