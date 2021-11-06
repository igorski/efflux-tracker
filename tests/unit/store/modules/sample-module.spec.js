import storeModule from "@/store/modules/sample-module";

const { getters, mutations, actions } = storeModule;

let mockResult;
jest.mock( "@/model/factories/sample-factory", () => ({
    getBuffer: jest.fn(() => mockResult ),
}));

describe( "Vuex sample module", () => {
    describe( "getters", () => {
        it( "should be able to get the current sample by the registered name", () => {
            const state = { currentSampleName: "bar" };
            const mockedGetters = { samples: [{ name: "foo" }, { name: "bar" }, { name: "baz" } ]};
            expect( getters.currentSample( state, mockedGetters )).toEqual( mockedGetters.samples[ 1 ]);
        });

        it( "should be able to get a specific sample from the cache through the curried getter", () => {
            const state = {
                sampleCache: new Map([[ "foo", { sample: "bar" }],[ "baz", { sample: "qux" }]])
            };
            expect( getters.sampleFromCache( state )( "foo" )).toEqual({ sample: "bar" });
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the current sample", () => {
            const state = { currentSampleName: null };
            mutations.setCurrentSample( state, { name: "foo" });
            expect( state.currentSampleName ).toEqual( "foo" );
        });

        it( "should be able to flush the existing sample cache", () => {
            const state = {
                sampleCache: new Map([[ "foo", { sample: "bar" }],[ "baz", { sample: "qux" }]])
            };
            mutations.flushSampleCache( state );
            expect( state.sampleCache.size ).toEqual( 0 );
        });

        it( "should be able to cache the buffer for individual samples and add it to the cache Map", () => {
            const state = {
                sampleCache: new Map([[ "foo", { sample: "bar" }]])
            };
            mockResult = { buffer: {} };
            const sample = { name: "baz" };

            mutations.cacheSample( state, sample );

            expect( state.sampleCache.size ).toEqual( 2 );
            expect( state.sampleCache.has( sample.name ));
            expect( state.sampleCache.get( sample.name )).toEqual({ ...sample, buffer: mockResult });
        });

        it( "should be able to remove individual samples from the cache", () => {
            const state = {
                sampleCache: new Map([[ "foo", { sample: "bar" }],[ "baz", { sample: "qux" }]])
            };
            mutations.removeSampleFromCache( state, { name: "baz" });
            expect( state.sampleCache.size ).toEqual( 1 );
            expect( state.sampleCache.has( "baz" )).toBe( false );
        });
    });

    describe( "actions", () => {
        it( "should be able to cache the active samples for a Song", () => {
            const commit = jest.fn();
            const samples = [{ name: "foo" }, { name: "bar" }, { name: "baz" } ];

            actions.cacheSongSamples({ commit }, samples );

            expect( commit ).toHaveBeenNthCalledWith( 1, "flushSampleCache" );
            expect( commit ).toHaveBeenNthCalledWith( 2, "cacheSample", samples[ 0 ]);
            expect( commit ).toHaveBeenNthCalledWith( 3, "cacheSample", samples[ 1 ]);
            expect( commit ).toHaveBeenNthCalledWith( 4, "cacheSample", samples[ 2 ]);
        });
    });
});
