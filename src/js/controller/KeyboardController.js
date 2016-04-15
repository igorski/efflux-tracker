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
var Messages = require( "../definitions/Messages" );
var Pubsub   = require( "pubsub-js" );

var tracker, listener, suspended = false, blockDefaults = true, optionDown = false;

module.exports =
{
    /**
     * initialize KeyboardController
     *
     * @param trackerRef
     */
    init : function( trackerRef )
    {
        tracker = trackerRef;
        window.addEventListener( "keydown", handleKeyDown );
        window.addEventListener( "keyup",   handleKeyUp );
    },

    /**
     * whether the Apple option or a control key is
     * currently held down for the given event
     *
     * @paran {Event} aEvent
     * @returns {boolean}
     */
    hasOption : function( aEvent )
    {
        return ( optionDown === true ) || aEvent.ctrlKey;
    },

    /**
     * attach a listener to receive updates whenever a key
     * has been released. listenerRef requires a "handleKey"
     * function which receives three arguments:
     *
     * {string} type, either "up" or "down"
     * {number} keyCode, the keys keyCode
     * {Event} event, the keyboard event
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
    },

    /**
     * whether to block default behaviour on certain keys
     *
     * @param value
     */
    setBlockDefaults : function( value )
    {
        blockDefaults = value;
    }
};

/* private handlers */

function handleKeyDown( aEvent )
{
    if ( !suspended && listener && listener.handleKey )
    {
        switch ( aEvent.keyCode )
        {
            case 32: // spacebar
                if ( blockDefaults )
                    aEvent.preventDefault();

                Pubsub.publish( Messages.TOGGLE_SEQUENCER_PLAYSTATE );
                break;

            // prevent defaults when using the arrows, space (prevents page jumps)
            // and backspace (prevents navigating back in history)

            case 8:
            case 37:
            case 38:
            case 39:
            case 40:
                if ( blockDefaults )
                    aEvent.preventDefault();
                break;

            // capture the apple key here as it not recognized as a modifier

            case 224:   // Firefox
            case 17:    // Opera
            case 91:    // WebKit left key
            case 93:    // Webkit right key
                optionDown = true;
                break;
        }
        listener.handleKey( "up", aEvent.keyCode, aEvent );
    }
}

function handleKeyUp( aEvent )
{
    if ( !suspended && listener && listener.handleKey )
    {
        if ( optionDown )
        {
            switch ( aEvent.keyCode )
            {
                case 224:   // Firefox
                case 17:    // Opera
                case 91:    // WebKit left key
                case 93:    // Webkit right key
                    optionDown = false;
                    break;
            }
        }
        listener.handleKey( "down", aEvent.keyCode, aEvent );
    }
}
