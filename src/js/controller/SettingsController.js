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
var Time             = require( "../utils/Time" );
var TemplateUtil     = require( "../utils/TemplateUtil" );
var SongUtil         = require( "../utils/SongUtil" );
var Pubsub           = require( "pubsub-js" );
var Messages         = require( "../definitions/Messages" );
var zMIDILib         = require( "zmidi" ),
    zMIDI            = zMIDILib.zMIDI;

/* private properties */

var container, keyboardController;

var SettingsController = module.exports =
{
    init : function( containerRef, keyboardControllerRef )
    {
        keyboardController = keyboardControllerRef;

        // create a list container to show the songs when loading

        container = document.createElement( "div" );
        container.setAttribute( "id", "config" );
        container.innerHTML = TemplateUtil.render( "settingsView" );
        containerRef.appendChild( container ); // see CSS for visibility toggles

        // add message listeners

        [
            Messages.CLOSE_OVERLAYS

        ].forEach( function( msg )
        {
            Pubsub.subscribe( msg, handleBroadcast );
        });
    },

    handleKey : function( type, keyCode, event )
    {
        if ( type === "down" && keyCode === 27 )
        {
            // close on escape key
            handleClose();
        }
    }
};
