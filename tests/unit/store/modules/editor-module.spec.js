import EditorModule from '@/store/modules/editor-module';
import LinkedList from '@/utils/linked-list';
import Config from '@/config';

const { mutations } = EditorModule;

describe('Editor module', () => {
    describe('Mutations', () => {
        describe('When selecting an instrument', () => {
            it('should be able to set the selected instrument', () => {
                const state = { selectedInstrument: 0 };
                mutations.setSelectedInstrument(state, 1);
                expect(state.selectedInstrument).toBe(1);
            });

            it('should be able to keep the selected instrument within the allotted range', () => {
                const state = { selectedInstrument: 0 };
                mutations.setSelectedInstrument(state, Config.INSTRUMENT_AMOUNT);
                expect(state.selectedInstrument).toEqual(Config.INSTRUMENT_AMOUNT - 1);
                mutations.setSelectedInstrument(state, -5);
                expect(state.selectedInstrument).toEqual(0);
            });
        });

        describe('When selecting a step', () => {
            it('should be able to set the selected step', () => {
                const state = { selectedStep: 0 };
                mutations.setSelectedStep(state, 1);
                expect(state.selectedStep).toEqual(1);
            });

            it('should be able to keep the selected step within the allotted range', () => {
                const state = { selectedStep: 0 };
                mutations.setSelectedStep(state, -1);
                expect(state.selectedStep).toEqual(0);
            });
        });

        describe('When selecting a slot', () => {
            it('should be able to set the selected slot', () => {
                const state = { selectedSlot: 0 };
                mutations.setSelectedSlot(state, 1);
                expect(state.selectedSlot).toEqual(1);
            });

            it('should be able to keep the selected slot within the allotted range', () => {
                const state = { selectedSlot: 0 };
                mutations.setSelectedSlot(state, 5);
                expect(state.selectedSlot).toEqual(3);
                mutations.setSelectedSlot(state, -5);
                expect(state.selectedSlot).toEqual(-1);
            });
        });

        it('should be able to set the higher keyboard octave', () => {
            const state = { higherKeyboardOctave: 2 };
            mutations.setHigherKeyboardOctave(state, 3);
            expect(state.higherKeyboardOctave).toEqual(3);
        });

        it('should be able to set the lower keyboard octave', () => {
            const state = { lowerKeyboardOctave: 2 };
            mutations.setLowerKeyboardOctave(state, 3);
            expect(state.lowerKeyboardOctave).toEqual(3);
        });

        it('should be able to set the currently selected oscillator index', () => {
            const state = { selectedOscillatorIndex: 0 };
            mutations.setSelectedOscillatorIndex(state, 1);
            expect(state.selectedOscillatorIndex).toEqual(1);
        });

        it('should be able to prepare the linked list for the events', () => {
            const state = { eventList: [] };
            mutations.prepareLinkedList(state);
            expect(state.eventList.length).toEqual(Config.INSTRUMENT_AMOUNT);
            for (let i = 0; i < state.eventList.length; ++i) {
                expect(state.eventList[i] instanceof LinkedList);
            }
        });

        it('should be able to reset the editor', () => {
            const state = {
                selectedInstrument: 7,
                selectedStep: 16
            };
            mutations.resetEditor(state);
            expect(state).toEqual({
                selectedInstrument: 0,
                selectedStep: 0
            });
        });
    });
});
