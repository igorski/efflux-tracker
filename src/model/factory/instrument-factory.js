/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import Config     from '@/config';
import ObjectUtil from '@/utils/object-util';

const InstrumentFactory =
{
    /**
     * create a new instrument Object
     *
     * @param {number} aId unique identifier for instrument, relates to the
     *                 index of the instrument inside a song instrument-list
     * @param {string=} aName optional name to use
     * @return {INSTRUMENT}
     */
    createInstrument( aId, aName ) {
        const instrument = {
            id   : aId,
            name : ( typeof aName === 'string' ) ? aName : `'Instrument ${aId.toString()}`,
            presetName: null,
            oscillators : [
                InstrumentFactory.createOscillator( true,  'TRIANGLE'  ),
                InstrumentFactory.createOscillator( false, 'SINE' ),
                InstrumentFactory.createOscillator( false, 'SAW' )
            ],
            volume: 1,
            panning: 0, // -1 = left, 0 = center, 1 = right
            filter : {
                enabled     : false,
                frequency   : Config.DEFAULT_FILTER_FREQ,
                q           : Config.DEFAULT_FILTER_Q,
                speed       : Config.DEFAULT_FILTER_LFO_SPEED,
                depth       : Config.DEFAULT_FILTER_LFO_DEPTH,
                type        : 'lowpass',
                lfoType     : 'off'
            },
            delay : {
                enabled  : false,
                type     : 0,
                time     : 0.5,
                feedback : 0.5,
                cutoff   : 880,
                offset   : 0
            }
        };
        InstrumentFactory.createOverdrive( instrument );
        InstrumentFactory.createEQ( instrument );
        return instrument;
    },
    /**
     * create default overdrive properties
     * this was not present in legacy instruments
     *
     * @param {INSTRUMENT} instrument
     */
    createOverdrive( instrument ) {
        if ( typeof instrument.overdrive === "object" ) return;

        instrument.overdrive = {
            enabled: false,
            preBand: 1.0,
            postCut: 8000,
            color:   4000,
            drive:   0.8
        };
    },
    /**
     * create default equalizer properties
     * this was not present in legacy instruments
     *
     * @param {INSTRUMENT} instrument
     */
    createEQ( instrument ) {
        if ( typeof instrument.eq === 'object' ) return;

        instrument.eq = {
            enabled  : false,
            lowGain  : 1,
            midGain  : 1,
            highGain : 1
        };
    },
    /**
     * @param {boolean} aEnabled
     * @param {string} aWaveform
     * @return {INSTRUMENT_OSCILLATOR}
     */
    createOscillator( aEnabled, aWaveform = 'SAW' ) {
        const oscillator = {
            enabled     : aEnabled,
            waveform    : aWaveform,
            table       : 0, // created when CUSTOM waveform is used
            volume      : 1,
            detune      : 0,
            octaveShift : 0,
            fineShift   : 0,
            adsr : {
                attack  : 0,
                decay   : 0,
                sustain : 0.75,
                release : 0
            }
        };
        InstrumentFactory.createPitchEnvelope( oscillator );

        return oscillator;
    },
    /**
     * create default pitch envelope properties in oscillator
     * this was not present in legacy instruments
     *
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    createPitchEnvelope( oscillator ) {
        if ( typeof oscillator.pitch === 'object' )
            return;

        oscillator.pitch = {
            range   : 0,
            attack  : 0,
            decay   : 1,
            sustain : 0.75,
            release : 0
        };
    },
    /**
     * lazily retrieve the custom WaveTable for given oscillator, if
     * it wasn't created yet, it is created here
     *
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     * @param {number=} size optional WaveTable size, defaults to Config value
     * @return {Array.<number>}
     */
    getTableForOscillator(oscillator, size ) {
        if ( !oscillator.table ) {

            if ( typeof size !== "number" )
                size = Config.WAVE_TABLE_SIZE;

            oscillator.table = new Array( size );

            while ( size-- )
                oscillator.table[ size ] = 0;
        }
        return oscillator.table;
    },
    /**
     * @param {Object} instrumentPreset
     * @param {number} newInstrumentId
     * @param {string} newInstrumentName
     * @return {INSTRUMENT}
     */
    loadPreset( instrumentPreset, newInstrumentId, newInstrumentName ) {
        const newInstrument = ObjectUtil.clone(instrumentPreset);
        newInstrument.id    = newInstrumentId;
        newInstrument.name  = newInstrumentName;

        // legacy presets have no pitch envelopes, pan, EQ or overdrive, create now

        newInstrument.panning = newInstrument.panning || 0;
        newInstrument.oscillators.forEach(( oscillator ) => InstrumentFactory.createPitchEnvelope( oscillator ));
        InstrumentFactory.createOverdrive( newInstrument );
        InstrumentFactory.createEQ( newInstrument );

        return newInstrument;
    }
};
export default InstrumentFactory;
