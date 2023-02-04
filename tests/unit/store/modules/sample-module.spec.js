/**
 * @jest-environment jsdom
 */
import storeModule from "@/store/modules/sample-module";

const { getters, mutations, actions } = storeModule;

let mockResult;
jest.mock( "@/model/factories/sample-factory", () => ({
    getBuffer: jest.fn(() => mockResult )
}));

describe( "Vuex sample module", () => {
    describe( "getters", () => {
        it( "should be able to get the current sample by the registered id", () => {
            const state = { currentSampleId: "s2" };
            const mockedGetters = { samples: [{ id: "s1" }, { id: "s2" }, { id: "s3" } ]};
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
            const state = { currentSampleId: null };
            mutations.setCurrentSample( state, { id: "s1" });
            expect( state.currentSampleId ).toEqual( "s1" );
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

        describe( "when updating an existing sample name", () => {
            let mockedGetters;

            beforeEach(() => {
                mockedGetters = {
                    samples: [{ id: "s1", name: "foo" }, { id: "s2", name: "bar" }, { id: "s3", name: "baz" }],
                    activeSong: {
                        instruments: [ { oscillators: [ { sample: "foo" }, { sample: "bar" }, { sample: "baz" } ] } ]
                    }
                };
            });

            it( "should update the sample cache identifiers and return the new name", () => {
                const commit  = jest.fn();
                const name    = "qux";
                const newName = actions.updateSampleName({ getters: mockedGetters, commit }, { id: "s1", name });

                const originalSample = mockedGetters.samples[ 0 ];
                const updatedSample  = { ...originalSample, name };

                expect( commit ).toHaveBeenNthCalledWith( 1, "removeSampleFromCache", originalSample );
                expect( commit ).toHaveBeenNthCalledWith( 2, "updateSample", updatedSample );
                expect( commit ).toHaveBeenNthCalledWith( 3, "cacheSample", updatedSample );

                expect( newName ).toEqual( "qux" );
            });

            it( "should update all references to the old names for all instruments", () => {
                const commit = jest.fn();
                const newName = actions.updateSampleName({ getters: mockedGetters, commit }, { id: "s2", name: "qux" });

                expect( commit ).toHaveBeenNthCalledWith( 4, "updateOscillator", {
                    instrumentIndex: 0,
                    oscillatorIndex: 1,
                    prop: "sample",
                    value: "qux"
                });
            });

            it( "should be able to deduplicate existing names", () => {
                const commit = jest.fn();
                const newName = actions.updateSampleName({ getters: mockedGetters, commit }, { id: "s1", name: "bar" });
                expect( newName ).toEqual( "bar #2" );
            });
        });
    });
});
