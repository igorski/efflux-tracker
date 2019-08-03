import store from '@/store/modules/midi-module';
const { mutations }  = store;

describe('MIDI module', () => {
    describe('mutations', () => {
        it('should be able to set the MIDI port number', () => {
            const state = { midiPortNumber: 0 };
            mutations.setMIDIPortNumber(state, 1);
            expect(state.midiPortNumber).toEqual(1);
        });

        it('should be able to set the MIDI connection flag', () => {
            const state = { midiConnected: false };
            mutations.setMIDIConnected(state, true);
            expect(state.midiConnected).toEqual(true);
        });

        it('should be able to format a MIDI connection list', () => {
            const state = { midiDeviceList: [] };
            mutations.createMIDIDeviceList(state, [
                { manufacturer: 'Acme', name : 'foo' },
                { manufacturer: 'Acme', name : 'bar' }
            ]);
            expect(state.midiDeviceList).toEqual([
                { title: 'Acme foo', value: 0 },
                { title: 'Acme bar', value: 1 }
            ]);
        });
    });
});
