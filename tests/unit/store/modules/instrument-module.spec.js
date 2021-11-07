import InstrumentModule  from '@/store/modules/instrument-module';
import InstrumentFactory from '@/model/factories/instrument-factory';

const { getters, mutations, actions } = InstrumentModule;

// mock storage

jest.mock('@/utils/storage-util', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
}));

describe('Vuex instrument module', () => {
    const dispatch = jest.fn();

    const instrument = InstrumentFactory.create(0);
    instrument.presetName = 'foo';

    let state;

    describe('getters', () => {
        it('should be able to retrieve all registered instruments', () => {
            state = {
                instruments: [{ foo: 'bar' }, { baz: 'qux' }]
            };
            expect(getters.getInstruments(state)).toEqual(state.instruments);
        });

        it('should be able to retrieve individual instruments by their preset name', () => {
            state = { instruments: [instrument] };
            expect(getters.getInstrumentByPresetName(state)(instrument.presetName)).toEqual(instrument);
        });
    });

    describe('mutations', () => {
        it('should be able to set the instruments', () => {
            const state = { instruments: [] };
            const instruments = [{ foo: 'bar' }];
            mutations.setInstruments(state, instruments);
            expect(state.instruments).toEqual(instruments);
        });

        it('should be able to set the given instruments preset name', () => {
            const ins = InstrumentFactory.create(0);
            mutations.setPresetName(state, { instrument: ins, presetName: 'quux' });
            expect(ins.presetName).toEqual('quux');
        });
    });

    describe('actions', () => {
        describe('when saving instruments', () => {
            it('should not save instruments without a valid preset name', async () => {
                const invalidInstrument = InstrumentFactory.create(0);
                const commit = jest.fn();

                try {
                    await actions.saveInstrument({ state, commit, dispatch }, invalidInstrument);
                } catch (e) {
                    // expected instrument without preset name not to have been saved
                }
            });

            it('should be able to save instruments in storage', async () => {
                state = { instruments: [] };
                const commit = jest.fn();

                await actions.saveInstrument({ state, commit, dispatch }, instrument);

                // expected instruments meta to have been saved into the instruments list
                expect(state.instruments).toEqual([
                    { presetName: instrument.presetName }
                ]);
            });
        });

        it('should be able to delete instruments from storage', async () => {
            state = { instruments: [instrument] };

            await actions.deleteInstrument({ state }, { instrument });

            expect(state.instruments).toHaveLength(0);
        });
    });
});
