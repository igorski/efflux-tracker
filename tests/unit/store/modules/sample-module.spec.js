import storeModule from "@/store/modules/sample-module";

const { getters, mutations } = storeModule;

describe( "Vuex sample module", () => {
    describe( "getters", () => {
        it( "should be able to retrieve all registered samples", () => {
            const state = { samples: [{ name: "foo" }, { name: "bar" }, { name: "baz" } ]};
            expect( getters.samples( state )).toEqual( state.samples );
        });

        it( "should be able to get the current sample by the currently registered name", () => {
            const state = {
                currentSampleName: "bar",
                samples: [{ name: "foo" }, { name: "bar" }, { name: "baz" } ]
            };
            expect( getters.currentSample( state )).toEqual( state.samples[ 1 ]);
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the samples", () => {
            const state = { samples: [] };
            const samples = [{ name: "foo" }, { name: "bar" }, { name: "baz" } ];
            mutations.setSamples( state, samples );
            expect( state.samples ).toEqual( samples );
        });

        it( "should be able to add a sample to the existing list", () => {
            const state = { samples: [{ name: "foo" }, { name: "bar" }, { name: "baz" } ]};
            const sample = { name: "qux" };
            mutations.addSample( state, sample );
            expect( state.samples ).toEqual(
                [{ name: "foo" }, { name: "bar" }, { name: "baz" }, { name: "qux" } ]
            );
        });

        it( "should be able to flush all currently registered samples", () => {
            const state = { samples: [{ name: "foo" }, { name: "bar" }, { name: "baz" } ]};
            mutations.flushSamples( state );
            expect( state.samples ).toEqual( [] );
        });

        it( "should be able to set the current sample", () => {
            const state = { currentSampleName: null };
            mutations.setCurrentSample( state, { name: "foo" });
            expect( state.currentSampleName ).toEqual( "foo" );
        });

        it( "should be able to update a registered sample of the same name as the given sample", () => {
            const state = {
                samples: [{ name: "foo", bar: "baz" }, { name: "qux", quux: "quuz" }, { name: "corge", grault: "garply" } ]
            };
            mutations.updateSample(state, { name: "qux", quux: "waldo" });
            expect( state.samples ).toEqual([
                { name: "foo", bar: "baz" }, { name: "qux", quux: "waldo" }, { name: "corge", grault: "garply" }
            ]);
        });
    });
});
