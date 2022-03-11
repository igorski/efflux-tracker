/**
 * @jest-environment jsdom
 */
import OscillatorTypes from "@/definitions/oscillator-types";
import InstrumentModule, { INSTRUMENT_STORAGE_KEY } from "@/store/modules/instrument-module";
import InstrumentFactory from "@/model/factories/instrument-factory";

const { getters, mutations, actions } = InstrumentModule;

// mock storage

let mockStorageFn = jest.fn();
jest.mock( "@/utils/storage-util", () => ({
    getItem: jest.fn(( ...args ) => Promise.resolve( mockStorageFn( "getItem", ...args ))),
    setItem: jest.fn(( ...args ) => Promise.resolve( mockStorageFn( "setItem", ...args ))),
    removeItem: jest.fn(( ...args ) => Promise.resolve( mockStorageFn( "removeItem", ...args )))
}));
let mockSampleFn;
jest.mock( "@/model/factories/sample-factory", () => ({
    deserialize: jest.fn(( ...args ) => Promise.resolve( mockSampleFn( "assemble", ...args )))
}));
jest.mock( "@/model/serializers/sample-serializer", () => ({
    serialize: jest.fn(( ...args ) => Promise.resolve( mockSampleFn( "serialize", ...args )))
}));

describe( "Vuex instrument module", () => {
    const dispatch = jest.fn();

    const instrument = InstrumentFactory.create( 0 );
    instrument.presetName = "foo";

    let state;

    describe( "getters", () => {
        it( "should be able to retrieve all registered instruments", () => {
            state = {
                instruments: [{ foo: "bar" }, { baz: "qux" }]
            };
            expect(getters.getInstruments(state)).toEqual(state.instruments);
        });

        it( "should be able to retrieve individual instruments by their preset name", () => {
            state = { instruments: [instrument] };
            expect(getters.getInstrumentByPresetName(state)(instrument.presetName)).toEqual(instrument);
        });
    });

    describe( "mutations", () => {
        it( "should be able to set the instruments", () => {
            const state = { instruments: [] };
            const instruments = [{ foo: "bar" }];
            mutations.setInstruments(state, instruments);
            expect(state.instruments).toEqual(instruments);
        });

        it( "should be able to set the given instruments preset name", () => {
            const ins = InstrumentFactory.create(0);
            mutations.setPresetName(state, { instrument: ins, presetName: "quux" });
            expect(ins.presetName).toEqual("quux");
        });
    });

    describe( "actions", () => {
        describe( "when saving instruments", () => {
            it( "should not save instruments without a valid preset name", async () => {
                const invalidInstrument = InstrumentFactory.create( 0 );
                let thrown = false;

                try {
                    await actions.saveInstrumentIntoLS({ state, getters: {}, dispatch }, invalidInstrument);
                } catch ( e ) {
                    thrown = true;
                }
                // expected instrument without preset name not to have been saved
                expect( thrown ).toBe( true );
            });

            it( "should be able to save instruments in storage", async () => {
                state = { instruments: [] };

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
                const sample1 = { name: "foo" };
                const sample2 = { name: "bar" };
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

                mockSampleFn = jest.fn();

                await actions.saveInstrumentIntoLS({ state, getters: mockedGetters, dispatch }, sampledInstrument );

                expect( mockSampleFn ).toHaveBeenCalledTimes( 2 );
                expect( mockSampleFn ).toHaveBeenNthCalledWith( 1, "serialize", sample1 );
                expect( mockSampleFn ).toHaveBeenNthCalledWith( 2, "serialize", sample2 );
            });
        });

        describe( "when loading instruments", () => {
            it( "should be able to load the serialized samples into the songs sample storage", async () => {
                const mockStoredInstrument = InstrumentFactory.create( 0 );
                mockStoredInstrument.presetName = "foo";
                mockStoredInstrument.oscillators[ 0 ].sample = { serializedSample: "foo" };
                mockStoredInstrument.oscillators[ 1 ].sample = { serializedSample: "bar" };

                mockStorageFn = jest.fn(() => JSON.stringify( mockStoredInstrument ));
                mockSampleFn  = jest.fn((( fn, oscSample ) => ({ name: oscSample.serializedSample }) ));
                const commit  = jest.fn();

                // mock song sample contents NOTE the sample serialized in the first oscillator
                // is already available. We can use this to verify only undefined samples are deserialized and set
                const sample1 = { name: "foo" };
                const mockedGetters = { samples: [ sample1 ] };

                await actions.loadInstrumentFromLS({ getters: mockedGetters, commit }, { presetName: mockStoredInstrument.presetName });

                // assert serialized instrument has been retrieved from storage
                expect( mockStorageFn ).toHaveBeenCalledWith( "getItem", `${INSTRUMENT_STORAGE_KEY}${mockStoredInstrument.presetName}` );

                // assert sample deserialization has been invoked
                expect( mockSampleFn ).toHaveBeenCalledTimes( 2 );
                expect( mockSampleFn ).toHaveBeenNthCalledWith( 1, "assemble", mockStoredInstrument.oscillators[ 0 ].sample );
                expect( mockSampleFn ).toHaveBeenNthCalledWith( 2, "assemble", mockStoredInstrument.oscillators[ 1 ].sample );

                // assert that the second sample (which didn't exist in the songs song list yet)
                // has been added to the list and requested to be precached
                expect( commit ).toHaveBeenCalledTimes( 2 );
                expect( commit ).toHaveBeenCalledWith( "addSample", { name: "bar" } );
                expect( commit ).toHaveBeenCalledWith( "cacheSample", { name: "bar" });
            });
        });

        it( "should be able to delete instruments from storage", async () => {
            state = { instruments: [ instrument ] };

            await actions.deleteInstrument({ state }, { instrument });

            expect( state.instruments ).toHaveLength( 0 );
        });
    });
});
