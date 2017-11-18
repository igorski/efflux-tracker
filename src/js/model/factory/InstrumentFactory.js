/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2017 - http://www.igorski.nl
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
"use strict";

const Config     = require( "../../config/Config" );
const ObjectUtil = require( "../../utils/ObjectUtil" );

/**
 * type definition for an instrument
 *
 * @typedef {{
 *     id: number,
 *     name: string,
 *     presetName: string,
 *     oscillators: Array.<INSTRUMENT_OSCILLATOR>,
 *     volume: number,
 *     overdrive: {
 *         enabled: boolean,
 *         preBand: number,
 *         postCut: number,
 *         color:   number,
 *         drive:   number,
 *     },
 *     eq: {
 *         enabled  : boolean,
 *         lowGain  : number,
 *         midGain  : number,
 *         highGain : number
 *     },
 *     filter : {
 *         enabled     : boolean
 *         frequency   : number,
 *         q           : number,
 *         speed       : number,
 *         depth       : number,
 *         type        : string,
 *         lfoType     : string,
 *     },
 *     delay : {
 *         enabled  : boolean,
 *         type     : number,
 *         time     : number,
 *         feedback : number,
 *         cutoff   : number,
 *         offset   : number
 *     }
 * }}
 *
 * @see InstrumentValidator
 */
let INSTRUMENT;

/**
 * type definition for an instruments oscillator
 * waveform is an enumeration which can be SAW, TRIANGLE, SQUARE or CUSTOM
 *
 * the table Array holds numerical values in the -1 to +1 range
 * describing a bipolar waveform for the oscillator to use when waveform is CUSTOM
 *
 * octaveShift (-2 to +2)
 * fineShift (-7 to +7)
 *
 * ADSR values are envelope operations in seconds
 *
 * @typedef {{
 *     enabled     : boolean,
 *     waveform    : string,
 *     table       : Array.<number>,
 *     volume      : number,
 *     detune      : number,
 *     octaveShift : number,
 *     fineShift   : number,
 *     adsr: {
 *         attack: number,
 *         decay: number,
 *         sustain: number,
 *         release: number
 *     },
 *     pitch: {
 *         range: number,
 *         attack: number,
 *         decay: number,
 *         sustain: number,
 *         release: number
 *     }
 * }}
 *
 * @see InstrumentValidator
 */
let INSTRUMENT_OSCILLATOR;

const InstrumentFactory = module.exports =
{
    /**
     * create a new instrument Object
     *
     * @public
     * @param {number} aId unique identifier for instrument, relates to the
     *                 index of the instrument inside a song instrument-list
     * @param {string=} aName optional name to use
     * @return {INSTRUMENT}
     */
    createInstrument( aId, aName )
    {
        const instrument = {
            id   : aId,
            name : ( typeof aName === "string" ) ? aName : "Instrument " + aId.toString(),
            presetName: null,
            oscillators : [
                InstrumentFactory.createOscillator( true  ),
                InstrumentFactory.createOscillator( false ),
                InstrumentFactory.createOscillator( false )
            ],
            volume: 1,
            filter : {
                enabled     : false,
                frequency   : Config.DEFAULT_FILTER_FREQ,
                q           : Config.DEFAULT_FILTER_Q,
                speed       : Config.DEFAULT_FILTER_LFO_SPEED,
                depth       : Config.DEFAULT_FILTER_LFO_DEPTH,
                type        : "lowpass",
                lfoType     : "off"
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
     * @public
     * @param {INSTRUMENT} instrument
     */
    createOverdrive( instrument )
    {
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
     * @public
     * @param {INSTRUMENT} instrument
     */
    createEQ( instrument )
    {
        if ( typeof instrument.eq === "object" ) return;

        instrument.eq = {
            enabled  : false,
            lowGain  : 1,
            midGain  : 1,
            highGain : 1
        };
    },

    /**
     * @public
     *
     * @param {boolean} aEnabled
     * @return {INSTRUMENT_OSCILLATOR}
     */
    createOscillator( aEnabled )
    {
        const oscillator = {
            enabled     : aEnabled,
            waveform    : "SAW",
            table       : 0, // created when CUSTOM waveform is used
            volume      : 1,
            detune      : 0,
            octaveShift : 0,
            fineShift   : 0,
            adsr : {
                attack  : 0,
                decay   : 0,
                sustain : .75,
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
     * @public
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    createPitchEnvelope( oscillator )
    {
        if ( typeof oscillator.pitch === "object" ) return;

        oscillator.pitch = {
            range   : 0,
            attack  : 0,
            decay   : 1,
            sustain : .75,
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
    getTableForOscillator( oscillator, size  )
    {
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
     * @public
     * @param {Object} instrumentPreset
     * @param {number} newInstrumentId
     * @param {string} newInstrumentName
     * @return {INSTRUMENT}
     */
    loadPreset( instrumentPreset, newInstrumentId, newInstrumentName )
    {
        const newInstrument = ObjectUtil.clone( instrumentPreset );
        newInstrument.id    = newInstrumentId;
        newInstrument.name  = newInstrumentName;

        // legacy presets have no pitch envelopes, EQ or overdrive, create now

        newInstrument.oscillators.forEach(( oscillator ) => InstrumentFactory.createPitchEnvelope( oscillator ));
        InstrumentFactory.createOverdrive( newInstrument );
        InstrumentFactory.createEQ( newInstrument );

        return newInstrument;
    }
};
