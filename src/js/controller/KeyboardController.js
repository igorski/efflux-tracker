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
var slocum, listener, suspended = false;

module.exports =
{
    /**
     * initialize KeyboardController
     *
     * @param slocumRef
     */
    init : function( slocumRef )
    {
        slocum = slocumRef;
        window.addEventListener( "keydown", handleKeyDown );
    },

    /**
     * attach a listener to receive updates whenever a key
     * has been released. listenerRef requires a "handleKey"
     * function
     *
     * @param {Object|Function} listenerRef
     */
    setListener : function( listenerRef )
    {
        listener = listenerRef;
    },

    /**
     * the KeyboardController can be suspended so it
     * will not fire its callback to the listeners
     *
     * @param {boolean} value
     */
    setSuspended : function( value )
    {
        suspended = value;
    }
};

/* private handlers */

function handleKeyDown( aEvent )
{
    if ( !suspended && listener && listener.handleKey )
    {
        // prevent defaults when using the arrows (prevents page jumps)
        // and backspace (prevent navigating back in history)

        if ([ 8, 37, 38, 39, 40 ].indexOf( aEvent.keyCode ) > -1 )
            aEvent.preventDefault();

        listener.handleKey( aEvent.keyCode );
    }
}
