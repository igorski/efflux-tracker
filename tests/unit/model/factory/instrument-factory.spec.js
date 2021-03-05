import InstrumentFactory   from '@/model/factories/instrument-factory';
import InstrumentValidator from '@/model/validators/instrument-validator';

describe('InstrumentFactory', () => {
    it('should be able to create a valid Instrument', () => {
        const instrument = InstrumentFactory.createInstrument(0, 'foo');

        expect(InstrumentValidator.isValid(instrument)).toBe(true);
    });

    it('should be able to retrieve an existing WaveTable for an oscillator', () => {
        const oscillator = InstrumentFactory.createOscillator();
        const table = oscillator.table = [];

        // expected InstrumentFactory to have returned set WaveTable unchanged
        expect(table).toEqual(InstrumentFactory.getTableForOscillator(oscillator));
    });

    it('should be able to lazily create a WaveTable for an oscillator', () => {
        const oscillator = InstrumentFactory.createOscillator();
        const table = InstrumentFactory.getTableForOscillator(oscillator);

        expect(table instanceof Array).toBe(true); // expected InstrumentFactory to have generated a WaveTable unchanged

        let i = table.length;
        while (i--)
            expect(0).toEqual(table[i]); // expected generated WaveTable to contain silence
    });

    it('should be able to generate a WaveTable for an oscillator at any given size', () => {
        const oscillator = InstrumentFactory.createOscillator();
        const size = Math.round(Math.random() * 500) + 1;
        const table = InstrumentFactory.getTableForOscillator(oscillator, size);

        expect(size).toEqual(table.length); // expected InstrumentFactory to have generated a WaveTable of requested size
    });

    it('should add the pitch envelope section to legacy instruments', () => {
        const instrument = InstrumentFactory.createInstrument(0, 'foo');

        // ensure no pitch envelopes exist

        instrument.oscillators.forEach((oscillator) => {
            delete oscillator.pitch;
        });

        const clonedInstrument = InstrumentFactory.loadPreset(instrument, 1, 'bar');

        clonedInstrument.oscillators.forEach((oscillator) => {
            expect(typeof oscillator.pitch).toBe('object');
        });
    });
});
