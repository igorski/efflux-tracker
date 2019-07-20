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

const Copy           = require( "../i18n/Copy" );
const Time           = require( "../utils/Time" );
const InstrumentUtil = require( "../utils/InstrumentUtil" );
const EventUtil      = require( "../utils/EventUtil" );
const SongUtil       = require( "../utils/SongUtil" );
const Pubsub         = require( "pubsub-js" );
const Messages       = require( "../definitions/Messages" );
const zMIDILib       = require( "zmidi" ),
      zMIDI          = zMIDILib.zMIDI,
      zMIDIEvent     = zMIDILib.zMIDIEvent,
      MIDINotes      = zMIDILib.MIDINotes;

/* private properties */

let efflux, audioController, sequencerController;
let currentlyConnectedInput = -1;

const MidiController = module.exports =
{
    init( effluxRef, audioControllerRef, sequencerControllerRef )
    {
        efflux              = effluxRef;
        audioController     = audioControllerRef;
        sequencerController = sequencerControllerRef;

        // setup messaging

        [
            Messages.MIDI_CONNECT_TO_INTERFACE,
            Messages.MIDI_ADD_LISTENER_TO_DEVICE

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    }
};

/* private methods */

function handleBroadcast( type, payload )
{
    switch ( type )
    {
        case Messages.MIDI_CONNECT_TO_INTERFACE:
            connectToMIDIInterface();
            break;

        case Messages.MIDI_ADD_LISTENER_TO_DEVICE:
            addMIDIListener( payload );
            break;
    }
}

function connectToMIDIInterface()
{
    zMIDI.connect( handleConnectSuccess, handleConnectFailure );
}

/**
 * @public
 *
 * @param {number} aPortNumber
 */
function addMIDIListener( aPortNumber )
{
    // first clean up all old listeners
    let amountOfPorts = zMIDI.getInChannels().length;

    aPortNumber = Math.max(0, Math.min(amountOfPorts - 1, aPortNumber)); // keep within range

    while ( amountOfPorts-- )
        zMIDI.removeMessageListener( amountOfPorts );

    zMIDI.addMessageListener( aPortNumber, handleMIDIMessage );
    currentlyConnectedInput = aPortNumber;

    const device = zMIDI.getInChannels()[ aPortNumber ];
    Pubsub.publish( Messages.MIDI_DEVICE_CONNECTED, aPortNumber );
    Pubsub.publish( Messages.SHOW_FEEDBACK, Copy.get( "MIDI_ENABLED", device.manufacturer + " " + device.name ));
}

/* event handlers */

function handleConnectSuccess()
{
    if ( zMIDI.getInChannels().length === 0 )
        return handleConnectFailure( "" );

    Pubsub.publish( Messages.SHOW_FEEDBACK, Copy.get( "MIDI_CONNECTED" ));
    Pubsub.publish( Messages.MIDI_RECEIVED_INPUT_DEVICES, zMIDI.getInChannels() );
}

function handleConnectFailure( msg )
{
    Pubsub.publish( Messages.SHOW_ERROR, Copy.get( "MIDI_FAILURE" ));
}

/**
 * @param {zMIDIEvent} aEvent
 */
function handleMIDIMessage( aEvent )
{
    const noteValue   = aEvent.value,   // we only deal with note on/off so these always reflect a NOTE
          pitch       = MIDINotes.getPitchByNoteNumber( noteValue),
          editorModel = efflux.EditorModel;

    switch ( aEvent.type )
    {
        case zMIDIEvent.NOTE_ON:

            const instrumentId  = efflux.EditorModel.activeInstrument;
            const instrument    = efflux.activeSong.instruments[ instrumentId ];
            InstrumentUtil.noteOn( pitch, instrument, editorModel.recordingInput, sequencerController );
            break;

        case zMIDIEvent.NOTE_OFF:
            InstrumentUtil.noteOff( pitch, sequencerController );
            break;
    }
}
