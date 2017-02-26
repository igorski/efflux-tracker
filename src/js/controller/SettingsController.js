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

const Form          = require( "../utils/Form" );
const SongUtil      = require( "../utils/SongUtil" );
const Pubsub        = require( "pubsub-js" );
const Messages      = require( "../definitions/Messages" );
const SettingsModel = require( "../model/SettingsModel" );
const zMIDILib      = require( "zmidi" ),
      zMIDI         = zMIDILib.zMIDI;

/* private properties */

let efflux, container, paramFormat, deviceSelect;

const SettingsController = module.exports =
{
    init( effluxRef, containerRef )
    {
        efflux = effluxRef;

        // create a list container to show the songs when loading

        container = document.createElement( "div" );
        container.setAttribute( "id", "settings" );
        efflux.TemplateService.render( "settingsView", container ).then(() => {

            containerRef.appendChild( container ); // see CSS for visibility toggles

            // grab reference to DOM elements

            paramFormat = container.querySelector( "#parameterInputFormat" );
            paramFormat.addEventListener( "change", handleParameterInputFormatChange );

            if ( zMIDI.isSupported() )  {
                container.querySelector( "#midiSetup" ).classList.add( "enabled" );
                container.querySelector( "#midiConnect" ).addEventListener( "click", handleMIDIConnect );
                deviceSelect = container.querySelector( "#midiDevices" );
                deviceSelect.addEventListener( "change", handleMIDIDeviceSelect );
            }

            // add event listeners

            container.querySelector( ".close-button" ).addEventListener( "click", handleClose );
        });

        // subscribe to messages

        [
            Messages.OPEN_SETTINGS_PANEL,
            Messages.CLOSE_OVERLAYS,
            Messages.MIDI_RECEIVED_INPUT_DEVICES

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
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
    Pubsub.publish( Messages.SHOW_BLIND );

    // load settings from the model

    const setting = efflux.SettingsModel.getSetting( SettingsModel.PROPERTIES.INPUT_FORMAT );
    if ( setting !== null )
        Form.setSelectedOption( paramFormat, setting );
}

function handleClose()
{
    container.classList.remove( "active" );
    Pubsub.publishSync( Messages.HIDE_BLIND );
}

function handleParameterInputFormatChange( aEvent )
{
    efflux.SettingsModel.saveSetting(
        SettingsModel.PROPERTIES.INPUT_FORMAT, Form.getSelectedOption( paramFormat )
    );
    Pubsub.publish( Messages.REFRESH_PATTERN_VIEW );
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
    let options = [], option, input;

    for ( let i = 0, l = aInputs.length; i < l; ++i )
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
