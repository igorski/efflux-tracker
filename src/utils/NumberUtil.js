/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019 - https://www.igorski.nl
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
// we use an 8-bit range for the hexadecimal values (256 steps)
// internally we use a 0 - 100 range floating point precision
const RESOLUTION = 255 / 100;

export default
{
    /**
     * convert given integer value to a hexadecimal string
     *
     * @public
     * @param {number} value in 0 - 100 range
     * @return {string}
     */
    toHex( value ) {
        const hex = Math.round( value * RESOLUTION ).toString( 16 );
        return ( hex.length === 1 ) ? `0${hex}` : hex;
    },

    /**
     * convert given hexadecimal value to a number in the 0 - 100 range
     *
     * @param {string} value
     * @return {number}
     */
    fromHex( value ) {
        return parseInt( value, 16 ) / RESOLUTION;
    },

    /**
     * validate whether given value is a valid hexadecimal
     *
     * @public
     * @param {string} value
     * @return {boolean}
     */
    isHex( value ) {
        if ( typeof value !== 'string' )
            return false;

        const converted = parseInt( value, 16 ).toString( 16 ).toUpperCase();

        // preceding 0 can be stripped (e.g. "00" will convert as "0", which is fine)
        if ( converted.length !== value.length )
            return ( `0${converted}` ) === value.toUpperCase();

        return converted === value.toUpperCase();
    }
};
