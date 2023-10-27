import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Sample } from "@/model/types/sample";
import type { EffluxState } from "@/store";
import storeModule, { createSampleState } from "@/store/modules/sample-module";
import { createSample } from "../../mocks";
import { PlaybackType } from "../../../../src/model/types/sample";

const { getters, mutations, actions } = storeModule;

let mockResult: AudioBuffer;
vi.mock( "@/model/factories/sample-factory", () => ({
    default: {
        getBuffer: vi.fn(() => mockResult )
    }
}));

describe( "Vuex sample module", () => {
    describe( "getters", () => {
        const mockRootState: EffluxState = {} as EffluxState;
        const mockRootGetters: any = {};

        it( "should be able to get the current sample by the registered id", () => {
            const state = createSampleState({ currentSampleId: "s2" });
            const mockedGetters = { samples: [{ id: "s1" }, { id: "s2" }, { id: "s3" } ]};
            expect( getters.currentSample( state, mockedGetters, mockRootState, mockRootGetters )).toEqual( mockedGetters.samples[ 1 ]);
        });

        it( "should be able to get a specific sample from the cache through the curried getter", () => {
            const sample1 = createSample( "bar" );
            const sample2 = createSample( "qux" );
            const state = createSampleState({
                sampleCache: new Map([[ "foo", sample1 ], [ "baz", sample2 ]])
            });
            expect( getters.sampleFromCache( state, {}, mockRootState, mockRootGetters )( "foo" )).toEqual( sample1 );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the current sample", () => {
            const state = createSampleState({ currentSampleId: null });
            mutations.setCurrentSample( state, { id: "s1" });
            expect( state.currentSampleId ).toEqual( "s1" );
        });

        it( "should be able to flush the existing sample cache", () => {
            const state = createSampleState({
                sampleCache: new Map([[ "foo", createSample( "bar" )],[ "baz", createSample( "qux" )]])
            });
            mutations.flushSampleCache( state );
            expect( state.sampleCache.size ).toEqual( 0 );
        });

        it( "should be able to cache the buffer for individual samples and add it to the cache Map", () => {
            const state = createSampleState({
                sampleCache: new Map([[ "foo", createSample( "bar" )]])
            });

            mockResult = { duration: 5000 } as AudioBuffer;
            const sample = { name: "baz" };

            mutations.cacheSample( state, sample );

            expect( state.sampleCache.size ).toEqual( 2 );
            expect( state.sampleCache.has( sample.name ));
            expect( state.sampleCache.get( sample.name )).toEqual({ ...sample, buffer: mockResult });
        });

        it( "should be able to remove individual samples from the cache", () => {
            const state = createSampleState({
                sampleCache: new Map([[ "foo", createSample( "bar" )],[ "baz", createSample( "qux" )]])
            } as unknown);

            mutations.removeSampleFromCache( state, { name: "baz" });
            expect( state.sampleCache.size ).toEqual( 1 );
            expect( state.sampleCache.has( "baz" )).toBe( false );
        });
    });

    describe( "actions", () => {
        it( "should be able to cache the active samples for a Song", () => {
            const commit = vi.fn();
            const samples = [ createSample( "foo" ), createSample( "bar" ), createSample( "baz" )];

            // @ts-expect-error Type 'ActionObject<SampleState, any>' has no call signatures.
            actions.cacheSongSamples({ commit }, samples );

            expect( commit ).toHaveBeenNthCalledWith( 1, "flushSampleCache" );
            expect( commit ).toHaveBeenNthCalledWith( 2, "cacheSample", samples[ 0 ]);
            expect( commit ).toHaveBeenNthCalledWith( 3, "cacheSample", samples[ 1 ]);
            expect( commit ).toHaveBeenNthCalledWith( 4, "cacheSample", samples[ 2 ]);
        });

        describe( "when updating an existing sample's properties", () => {
            let mockedGetters: any;

            beforeEach(() => {
                mockedGetters = {
                    samples: [ createSample( "foo", "s1" ), createSample( "bar", "s2" ), createSample( "baz", "s3" )],
                    activeSong: {
                        instruments: [ { oscillators: [ { sample: "foo" }, { sample: "bar" }, { sample: "baz" } ] } ]
                    }
                };
            });

            it( "should be able to update the sample type and sample-related caches", () => {
                const commit = vi.fn();
                const type = PlaybackType.SLICED;

                const originalSample = mockedGetters.samples[ 2 ];
                const newSample = { ...originalSample, type };

                // @ts-expect-error Type 'ActionObject<SampleState, any>' has no call signatures.
                const updatedSample = actions.updateSampleProps({ getters: mockedGetters, commit }, newSample );

                expect( commit ).toHaveBeenNthCalledWith( 1, "removeSampleFromCache", originalSample );
                expect( commit ).toHaveBeenNthCalledWith( 2, "updateSongSample", updatedSample );
                expect( commit ).toHaveBeenNthCalledWith( 3, "cacheSample", updatedSample );

                expect( updatedSample.type ).toEqual( type );
            });

            describe( "and renaming the sample", () => {
                it( "should update the sample cache identifiers and return the new name", () => {
                    const commit = vi.fn();
                    const name = "qux";

                    const originalSample = mockedGetters.samples[ 0 ];
                    const newSample = { ...originalSample, name };
                   
                    // @ts-expect-error Type 'ActionObject<SampleState, any>' has no call signatures.
                    const updatedSample = actions.updateSampleProps({ getters: mockedGetters, commit }, newSample );

                    expect( commit ).toHaveBeenNthCalledWith( 1, "removeSampleFromCache", originalSample );
                    expect( commit ).toHaveBeenNthCalledWith( 2, "updateSongSample", updatedSample );
                    expect( commit ).toHaveBeenNthCalledWith( 3, "cacheSample", updatedSample );

                    expect( updatedSample.name ).toEqual( "qux" );
                });

                it( "should update all references to the old names for all instruments", () => {
                    const commit = vi.fn();

                    const name = "qux";

                    const originalSample = mockedGetters.samples[ 1 ];
                    const newSample = { ...originalSample, name };

                    // @ts-expect-error Type 'ActionObject<SampleState, any>' has no call signatures.
                    actions.updateSampleProps({ getters: mockedGetters, commit }, newSample );

                    expect( commit ).toHaveBeenNthCalledWith( 4, "updateOscillator", {
                        instrumentIndex: 0,
                        oscillatorIndex: 1,
                        prop: "sample",
                        value: "qux"
                    });
                });

                it( "should be able to deduplicate existing names", () => {
                    const commit = vi.fn();
                    const name = "bar";

                    const originalSample = mockedGetters.samples[ 0 ];
                    const newSample = { ...originalSample, name };

                    // @ts-expect-error Type 'ActionObject<SampleState, any>' has no call signatures.
                    const updatedSample = actions.updateSampleProps({ getters: mockedGetters, commit }, newSample );
                    
                    expect( updatedSample.name ).toEqual( "bar #2" );
                });
            });
        });
    });
});
