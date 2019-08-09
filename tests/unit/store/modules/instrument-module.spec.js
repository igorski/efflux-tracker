import InstrumentModule    from '../../../../src/store/modules/instrument-module';
import InstrumentValidator from '../../../../src/model/validators/instrument-validator';
import InstrumentFactory   from '../../../../src/model/factory/instrument-factory';

const { getters, mutations, actions } = InstrumentModule;

// mock storage

jest.mock('../../../../src/utils/storage-util', () => ({
    setItem: jest.fn()
}));

describe('InstrumentModel', () => {
    const dispatch = jest.fn();

    const instrument = InstrumentFactory.createInstrument(0);
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

        it('should be able to add individual instruments', () => {
            const state = { instruments: [{ foo: 'bar' }] };
            const newInstrument = { baz: 'qux' };
            mutations.addInstrument(state, newInstrument);
            expect(state.instruments).toEqual([{ foo: 'bar' }, { baz: 'qux' }]);
        });

        it('should be able to set the currently editing oscillator index', () => {
            const state = { activeOscillatorIndex: 0 };
            mutations.setActiveOscillatorIndex(state, 1);
            expect(state.activeOscillatorIndex).toEqual(1);
        });

        it('should be able to set the given instruments preset name', () => {
            const ins = InstrumentFactory.createInstrument(0);
            mutations.setPresetName(state, { instrument: ins, presetName: 'quux' });
            expect(ins.presetName).toEqual('quux');
        });
    });

    describe('actions', () => {
        describe('when saving instruments', () => {
            it('should not save instruments without a valid preset name', async () => {
                const invalidInstrument = InstrumentFactory.createInstrument(0);
                const commit = jest.fn();

                try {
                    await actions.saveInstrument({ state, commit, dispatch }, invalidInstrument);
                } catch (e) {
                    // expected instrument without preset name not to have been saved
                }
                expect(commit).not.toHaveBeenCalledWith('addInstrument', invalidInstrument);
            });

            it('should be able to save instruments in storage', async () => {
                state = { instruments: [] };
                const commit = jest.fn();

                await actions.saveInstrument({ state, commit, dispatch }, instrument);

                expect(commit).toHaveBeenCalledWith('addInstrument', instrument);
            });
        });

        it('should be able to delete instruments from storage', async () => {
            state = { instruments: [instrument] };

            await actions.deleteInstrument({ state }, { instrument });

            expect(0).toEqual(getters.getInstruments(state).length);;
        });
    });
});
