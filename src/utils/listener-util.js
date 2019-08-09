/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - https://www.igorski.nl
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
let supportsPassive = false;

export default {
    /**
     * attach an event listener to given DOM Object
     * using this method allows use of passive listeners when supported
     *
     * @param {Element} object
     * @param {string} eventType
     * @param {!Function} handler
     */
    listen( object, eventType, handler ) {
        object.addEventListener( eventType, handler, ( supportsPassive ) ? { passive: true } : false );
    }
};

// Test via a getter in the options object to see if the passive property is accessed
try {
    const opts = Object.defineProperty({}, 'passive', {
        get: function() {
            return supportsPassive = true;
        }
    });
    window.addEventListener( "test", null, opts );

} catch (e) {
    // nowt...
}
