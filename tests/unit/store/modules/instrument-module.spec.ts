import { describe, it, expect, vi } from "vitest";
import OscillatorTypes from "@/definitions/oscillator-types";
import type { EffluxState } from "@/store";
import InstrumentModule, { createInstrumentState, INSTRUMENT_STORAGE_KEY } from "@/store/modules/instrument-module";
import InstrumentFactory from "@/model/factories/instrument-factory";
import type { XTKSample } from "@/model/serializers/sample-serializer";
import type { InstrumentSerialized } from "@/model/types/instrument";
import { createSample } from "../../mocks";

const { getters, mutations, actions } = InstrumentModule;

// mock storage

let mockStorageFn = vi.fn();
vi.mock( "@/utils/storage-util", () => ({
    default: {
        getItem: vi.fn(( ...args ) => Promise.resolve( mockStorageFn( "getItem", ...args ))),
        setItem: vi.fn(( ...args ) => Promise.resolve( mockStorageFn( "setItem", ...args ))),
        removeItem: vi.fn(( ...args ) => Promise.resolve( mockStorageFn( "removeItem", ...args ))),
    }
}));
let mockSampleFn: ( fnName: string, ...args: any ) => Promise<any>;
vi.mock( "@/model/factories/sample-factory", () => ({
    default: {
        deserialize: vi.fn(( ...args ) => Promise.resolve( mockSampleFn( "deserialize", ...args ))),
    }
}));
vi.mock( "@/model/serializers/sample-serializer", () => ({
    serialize: vi.fn(( ...args ) => Promise.resolve( mockSampleFn( "serialize", ...args )))
}));

describe( "Vuex instrument module", () => {
    const dispatch = vi.fn();

    const instrument = InstrumentFactory.create( 0 );
    instrument.presetName = "foo";

    describe( "getters", () => {
        const mockedGetters: any = {};
        const mockRootState: EffluxState = {} as EffluxState;
        const mockRootGetters: any = {};

        it( "should be able to retrieve all registered instruments", () => {
            const state = createInstrumentState({
                instruments: [{ presetName: "bar" }, { presetName: "baz" }]
            });
            expect(
                getters.getInstruments( state, mockedGetters, mockRootState, mockRootGetters )
            ).toEqual( state.instruments );
        });

        it( "should be able to retrieve individual instruments by their preset name", () => {
            const state = createInstrumentState({ instruments: [ instrument ] });
            expect(
                getters.getInstrumentByPresetName( state, mockedGetters, mockRootState, mockRootGetters )( instrument.presetName )
            ).toEqual( instrument );
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the instruments", () => {
            const state = createInstrumentState();
            const instruments = [{ presetName: "bar" }];
            mutations.setInstruments(state, instruments);
            expect(state.instruments).toEqual(instruments);
        });

        it( "should be able to set the given instruments preset name", () => {
            const ins = InstrumentFactory.create( 0 );
            mutations.setPresetName( createInstrumentState(), { instrument: ins, presetName: "quux" });
            expect( ins.presetName ).toEqual( "quux" );
        });
    });

    describe( "actions", () => {
        describe( "when saving instruments", () => {
            it( "should not save instruments without a valid preset name", async () => {
                const invalidInstrument = InstrumentFactory.create( 0 );
                let thrown = false;

                try {
                    // @ts-expect-error Type 'ActionObject<InstrumentState, any>' has no call signatures.
                    await actions.saveInstrumentIntoLS({ state: createInstrumentState(), getters: {}, dispatch }, invalidInstrument);
                } catch ( e ) {
                    thrown = true;
                }
                // expected instrument without preset name not to have been saved
                expect( thrown ).toBe( true );
            });

            it( "should be able to save instruments in storage", async () => {
                const state = createInstrumentState();

                // @ts-expect-error Type 'ActionObject<InstrumentState, any>' has no call signatures.
                await actions.saveInstrumentIntoLS({ state, getters: {}, dispatch }, instrument );

                // expected instruments meta to have been saved into the instruments list
                expect( state.instruments ).toEqual([
                    { presetName: instrument.presetName }
                ]);
            });

            it( "should be able to serialize used samples into storage", async () => {
                const sampledInstrument = InstrumentFactory.create( 0 );
                sampledInstrument.presetName = "thisIsNowValid";

                // mock song sample contents
                const sample1 = createSample( "foo" );
                const sample2 = createSample( "bar" );
                const mockedGetters = { samples: [ sample1, sample2 ] };

                // make instrument oscillator reference samples
                sampledInstrument.oscillators[ 0 ] = {
                    ...sampledInstrument.oscillators[ 0 ],
                    sample   : sample1.name,
                    waveform : OscillatorTypes.SAMPLE
                };
                sampledInstrument.oscillators[ 1 ] = {
                    ...sampledInstrument.oscillators[ 1 ],
                    sample   : sample2.name,
                    waveform : OscillatorTypes.SAMPLE
                };

                mockSampleFn = vi.fn();

                // @ts-expect-error Type 'ActionObject<InstrumentState, any>' has no call signatures.
                await actions.saveInstrumentIntoLS({ state: createInstrumentState(), getters: mockedGetters, dispatch }, sampledInstrument );

                expect( mockSampleFn ).toHaveBeenCalledTimes( 2 );
                expect( mockSampleFn ).toHaveBeenNthCalledWith( 1, "serialize", sample1 );
                expect( mockSampleFn ).toHaveBeenNthCalledWith( 2, "serialize", sample2 );
            });
        });

        describe( "when loading instruments", () => {
            it( "should be able to load the serialized samples into the songs sample storage", async () => {
                const mockStoredInstrument = InstrumentFactory.create( 0 ) as unknown as InstrumentSerialized;
                mockStoredInstrument.presetName = "foo";
                mockStoredInstrument.oscillators[ 0 ].sample = { n: "foo" } as XTKSample;
                mockStoredInstrument.oscillators[ 1 ].sample = { n: "bar" } as XTKSample;

                mockStorageFn = vi.fn(() => JSON.stringify( mockStoredInstrument ));
                // @ts-expect-error fn is declared but its value is never read.
                mockSampleFn  = vi.fn((( fn, oscSample ) => ({ name: oscSample.n }) ));
                const commit  = vi.fn();

                // mock song sample contents NOTE the sample serialized in the first oscillator
                // is already available. We can use this to verify only undefined samples are deserialized and set
                const sample1 = createSample( "foo" );
                const mockedGetters = { samples: [ sample1 ] };

                // @ts-expect-error Type 'ActionObject<InstrumentState, any>' has no call signatures.
                await actions.loadInstrumentFromLS({ getters: mockedGetters, commit }, { presetName: mockStoredInstrument.presetName });

                // assert serialized instrument has been retrieved from storage
                expect( mockStorageFn ).toHaveBeenCalledWith( "getItem", `${INSTRUMENT_STORAGE_KEY}${mockStoredInstrument.presetName}` );

                // assert sample deserialization has been invoked
                expect( mockSampleFn ).toHaveBeenCalledTimes( 2 );
                expect( mockSampleFn ).toHaveBeenNthCalledWith( 1, "deserialize", mockStoredInstrument.oscillators[ 0 ].sample );
                expect( mockSampleFn ).toHaveBeenNthCalledWith( 2, "deserialize", mockStoredInstrument.oscillators[ 1 ].sample );

                // assert that the second sample (which didn't exist in the songs song list yet)
                // has been added to the list and requested to be precached
                expect( commit ).toHaveBeenCalledTimes( 2 );
                expect( commit ).toHaveBeenCalledWith( "addSample", { name: "bar" } );
                expect( commit ).toHaveBeenCalledWith( "cacheSample", { name: "bar" });
            });
        });

        it( "should be able to delete instruments from storage", async () => {
            const state = createInstrumentState({ instruments: [ instrument ] });

            // @ts-expect-error Type 'ActionObject<InstrumentState, any>' has no call signatures.
            await actions.deleteInstrument({ state }, { instrument });

            expect( state.instruments ).toHaveLength( 0 );
        });
    });
});
