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
var PatternFactory   = require( "../factory/PatternFactory" );
var Pubsub           = require( "pubsub-js" );
var Messages         = require( "../definitions/Messages" );
var zMIDILib         = require( "zmidi" ),
    zMIDI            = zMIDILib.zMIDI,
    zMIDIEvent       = zMIDILib.zMIDIEvent,
    MIDINotes        = zMIDILib.MIDINotes;

/* private properties */

var tracker, audioController;
var currentlyConnectedInput = -1, playingNotes = [];

var MidiController = module.exports =
{
    init : function( trackerRef, audioControllerRef )
    {
        tracker         = trackerRef;
        audioController = audioControllerRef;

        // setup messaging

        [
            Messages.MIDI_CONNECT_TO_INTERFACE,
            Messages.MIDI_ADD_LISTENER_TO_DEVICE

        ].forEach( function( msg ) {
            Pubsub.subscribe( msg, handleBroadcast );
        })
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
    var amountOfPorts = zMIDI.getInChannels().length;

    while ( amountOfPorts-- )
        zMIDI.removeMessageListener( amountOfPorts );

    zMIDI.addMessageListener( aPortNumber, handleMIDIMessage );
    currentlyConnectedInput = aPortNumber;

    var device = zMIDI.getInChannels()[ aPortNumber ];
    Pubsub.publish( Messages.SHOW_FEEDBACK,
        "Listening to MIDI messages coming from " + device.manufacturer + " " + device.name
    );
}

/* event handlers */

function handleConnectSuccess()
{
    if ( zMIDI.getInChannels().length === 0 )
        return handleConnectFailure( "" );

    Pubsub.publish( Messages.SHOW_FEEDBACK, "MIDI Connection established successfully" );
    Pubsub.publish( Messages.MIDI_RECEIVED_INPUT_DEVICES, zMIDI.getInChannels() );
}

function handleConnectFailure( msg )
{
    Pubsub.publish( Messages.SHOW_ERROR, "MIDI Unavailable, zTracker could not connect to MIDI device(s)" );
}

/**
 * @param {zMIDIEvent} aEvent
 */
function handleMIDIMessage( aEvent )
{
    var noteValue = aEvent.value;   // we only deal with note on/off so these always reflect a NOTE
    var audioEvent;

    switch ( aEvent.type )
    {
        case zMIDIEvent.NOTE_ON:

            var pitch = MIDINotes.getPitchByNoteNumber( noteValue );

            var instrumentId  = tracker.EditorModel.activeInstrument;
            var instrument    = tracker.activeSong.instruments[ instrumentId ];
            audioEvent        = PatternFactory.createAudioEvent( instrumentId );
            audioEvent.note   = pitch.note;
            audioEvent.octave = pitch.octave;
            audioEvent.action = 1; // noteOn

            playingNotes[ noteValue ] = { event: audioEvent, instrument: instrument };
            audioController.noteOn( audioEvent, instrument );
            break;

        case zMIDIEvent.NOTE_OFF:

            audioEvent = playingNotes[ noteValue ];

            if ( audioEvent )
                audioController.noteOff( audioEvent.event, audioEvent.instrument );

            delete playingNotes[ noteValue ];
            break;
    }
}
