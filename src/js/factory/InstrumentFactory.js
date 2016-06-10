/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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

const Config = require( "../config/Config" );

/**
 * type definition for an instrument
 *
 * @typedef {{
 *              id: number,
 *              name: string,
 *              oscillators: Array.<INSTRUMENT_OSCILLATOR>,
 *              volume: number,
 *              filter : {
 *                  frequency   : number,
 *                  q           : number,
 *                  speed       : number,
 *                  depth       : number,
 *                  type        : string,
 *                  lfoType     : string,
 *                  enabled     : boolean
 *              },
 *              delay : {
 *                  enabled  : boolean,
 *                  type     : number,
 *                  time     : number,
 *                  feedback : number,
 *                  cutoff   : number,
 *                  offset   : number
 *              }
 *          }}
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
 *     fineShift   : number
 *     adsr: {
 *         attack: number,
 *         decay: number,
 *         sustain: number,
 *         release: number
 *     }
 * }}
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
    createInstrument : function( aId, aName )
    {
        return {
            id   : aId,
            name : ( typeof aName === "string" ) ? aName : "Instrument " + aId.toString(),
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
    },

    /**
     * @public
     *
     * @param {boolean} aEnabled
     * @return {INSTRUMENT_OSCILLATOR}
     */
    createOscillator : function( aEnabled )
    {
        return {
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
    },

    /**
     * lazily retrieve the custom WaveTable for given oscillator, if
     * it wasn't created yet, it is created here
     *
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     * @param {number=} size optional WaveTable size, defaults to Config value
     * @return {Array.<number>}
     */
    getTableForOscillator : function( oscillator, size  )
    {
        if ( !oscillator.table ) {

            if ( typeof size !== "number" )
                size = Config.WAVE_TABLE_SIZE;

            oscillator.table = new Array( size );

            while ( size-- )
                oscillator.table[ size ] = 0;
        }
        return oscillator.table;
    }
};
