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
var Form             = require( "../utils/Form" );
var Time             = require( "../utils/Time" );
var TemplateUtil     = require( "../utils/TemplateUtil" );
var SongUtil         = require( "../utils/SongUtil" );
var Pubsub           = require( "pubsub-js" );
var Messages         = require( "../definitions/Messages" );
var zMIDILib         = require( "zmidi" ),
    zMIDI            = zMIDILib.zMIDI;

/* private properties */

var container, keyboardController;
var deviceSelect;

var SettingsController = module.exports =
{
    init : function( containerRef, keyboardControllerRef )
    {
        keyboardController = keyboardControllerRef;

        // create a list container to show the songs when loading

        container = document.createElement( "div" );
        container.setAttribute( "id", "settings" );
        container.innerHTML = TemplateUtil.render( "settingsView" );
        containerRef.appendChild( container ); // see CSS for visibility toggles

        // grab reference to DOM elements

        if ( zMIDI.isSupported() )  {
            container.querySelector( "#midiSetup" ).classList.add( "enabled" );
            container.querySelector( "#midiConnect" ).addEventListener( "click", handleMIDIConnect );
            deviceSelect = container.querySelector( "#midiDevices" );
            deviceSelect.addEventListener( "change", handleMIDIDeviceSelect );
        }

        // add message listeners

        [
            Messages.OPEN_SETTINGS_PANEL,
            Messages.CLOSE_OVERLAYS,
            Messages.MIDI_RECEIVED_INPUT_DEVICES

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

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.OPEN_SETTINGS_PANEL:
            handleOpen();
            break;

        case Messages.CLOSE_OVERLAYS:
            handleClose();
            break;

        case Messages.MIDI_RECEIVED_INPUT_DEVICES:
            showAvailableMIDIDevices( payload );
            break;
    }
}

function handleOpen()
{
    container.classList.add( "active" );
    keyboardController.setListener( SettingsController );
}

function handleClose()
{
    container.classList.remove( "active" );
}

function handleMIDIConnect( aEvent )
{
    Pubsub.publish( Messages.MIDI_CONNECT_TO_INTERFACE );
}

function handleMIDIDeviceSelect( aEvent )
{
    Pubsub.publish( Messages.MIDI_ADD_LISTENER_TO_DEVICE, aEvent.target );
}

function showAvailableMIDIDevices( aInputs )
{
    var options = [], option, input;

    for ( var i = 0, l = aInputs.length; i < l; ++i )
    {
        input  = aInputs[ i ];
        option = {
            title : input.manufacturer + " " + input.name,
            value : i
        };
       options.push( option );
    }
    Form.setOptions( deviceSelect, options );

    if ( options.length === 1 )
        Pubsub.publish( Messages.MIDI_ADD_LISTENER_TO_DEVICE, 0 );
}
