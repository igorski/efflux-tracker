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

/**
 * type definition for an instrument
 *
 * @typedef {{
 *              id: number,
 *              name: string,
 *              adsr: {
 *                  attack: number,
 *                  decay: number,
 *                  sustain: number,
 *                  release: number
 *              },
 *              oscillators: Array.<INSTRUMENT_OSCILLATOR>
 *          }}
 */
var INSTRUMENT;

/**
 * type definition for an instruments oscillator
 * the table Array hold numerical values in the -1 to +1 range
 * describing a bipolar waveform for the oscillator
 *
 * @typedef {{
 *     enabled: boolean,
 *     table: Array.<number>
 * }}
 */
var INSTRUMENT_OSCILLATOR;

var DEFAULT_TABLE_SIZE = 512;

var InstrumentFactory = module.exports =
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
            name : ( typeof aName === "string" ) ? aName : "Instrument " + ( aId + 1 ),
            adsr : {
                attack  : 0,
                decay   : 0,
                sustain : 1,
                release : 0
            },
            oscillators : [
                InstrumentFactory.createOscillator( true,  DEFAULT_TABLE_SIZE ),
                InstrumentFactory.createOscillator( false, DEFAULT_TABLE_SIZE ),
                InstrumentFactory.createOscillator( false, DEFAULT_TABLE_SIZE )
            ]
        };
    },

    /**
     * @public
     *
     * @param {boolean} aEnabled
     * @param {number|Array.<number>} aTable either number or Array
     *        when number aTable defines the table size, when Array
     *        it defines a list of number defining the table content (will be cloned)
     * @return {INSTRUMENT_OSCILLATOR}
     */
    createOscillator : function( aEnabled, aTable )
    {
        var table;

        if ( aTable instanceof Array ) {
            table = aTable.concat();
        }
        else {
            if ( typeof aTable !== "number" )
                aTable = DEFAULT_TABLE_SIZE;

            table = new Array( aTable );

            for ( var i = 0; i < aTable; ++i )
                table[ i ] = 0;
        }

        return {
            enabled: aEnabled,
            table: table
        };
    }
};
