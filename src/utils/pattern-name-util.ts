/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
const DICTIONARY = "ABCDEF0123456789";
const LENGTH     = DICTIONARY.length;

export const indexToName = ( patternIndex: number, startAtA = true ): string => {
    if ( startAtA ) {
        patternIndex += 17;
    }
    patternIndex = Math.abs( Math.floor( patternIndex ));

    let index    = patternIndex % LENGTH;
    let quotient = patternIndex / LENGTH;
    let result;
    
    if ( patternIndex <= LENGTH ) {
        return numToLetter( patternIndex );
    }

    if ( quotient > 0 ) {
        if ( index === 0 ) {
            --quotient;
        }
        result = indexToName( quotient, false );
    }

    if ( index === 0 ) {
        index = LENGTH;
    }
    return result + numToLetter( index );
};

/* internal methods */

function numToLetter( number: number ): string {
    if ( number > LENGTH || number < 0 ) {
        return "";
    }
    if ( number === 0 ) {
        return "";
    } else {
        return DICTIONARY.slice( number - 1, number );
    }
}