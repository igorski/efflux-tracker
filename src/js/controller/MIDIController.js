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

const Copy         = require( "../i18n/Copy" );
const Time         = require( "../utils/Time" );
const TemplateUtil = require( "../utils/TemplateUtil" );
const EventUtil    = require( "../utils/EventUtil" );
const SongUtil     = require( "../utils/SongUtil" );
const EventFactory = require( "../factory/EventFactory" );
const Pubsub       = require( "pubsub-js" );
const Messages     = require( "../definitions/Messages" );
const zMIDILib     = require( "zmidi" ),
      zMIDI        = zMIDILib.zMIDI,
      zMIDIEvent   = zMIDILib.zMIDIEvent,
      MIDINotes    = zMIDILib.MIDINotes;

/* private properties */

let efflux, audioController, sequencerController;
let currentlyConnectedInput = -1, playingNotes = [];

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
            Messages.MIDI_ADD_LISTENER_TO_DEVICE,
            Messages.PLAYBACK_STOPPED

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

        case Messages.PLAYBACK_STOPPED:
            sanitizeRecordedEvents();
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
          editorModel = efflux.EditorModel;

    let audioEvent;

    switch ( aEvent.type )
    {
        case zMIDIEvent.NOTE_ON:

            const pitch = MIDINotes.getPitchByNoteNumber( noteValue );

            const instrumentId  = editorModel.activeInstrument;
            const instrument    = efflux.activeSong.instruments[ instrumentId ];
            audioEvent          = EventFactory.createAudioEvent( instrumentId );
            audioEvent.note     = pitch.note;
            audioEvent.octave   = pitch.octave;
            audioEvent.action   = 1; // noteOn

            playingNotes[ noteValue ] = { event: audioEvent, instrument: instrument };
            audioController.noteOn( audioEvent, instrument );

            if ( editorModel.recordingInput )
                recordEventIntoSong( audioEvent );

            break;

        case zMIDIEvent.NOTE_OFF:

            audioEvent = playingNotes[ noteValue ];

            if ( audioEvent ) {
                audioController.noteOff( audioEvent.event, audioEvent.instrument );

                if ( editorModel.recordingInput ) {
                    const offEvent = EventFactory.createAudioEvent( audioEvent.instrument.id );
                    offEvent.action = 2; // noteOff
                    recordEventIntoSong( offEvent );
                }
            }
            delete playingNotes[ noteValue ];
            break;
    }
}

function recordEventIntoSong( audioEvent )
{
    if ( sequencerController.getPlaying() ) {

        // sequencer is playing, add event at current step

        const editorModel   = efflux.EditorModel;
        const song          = efflux.activeSong;
        const activePattern = editorModel.activePattern;
        const pattern       = song.patterns[ activePattern ];
        const channel       = pattern.channels[ editorModel.activeInstrument ];
        const step          = Math.round( sequencerController.getPosition().step / 64 * editorModel.amountOfSteps );

        EventUtil.setPosition(
            audioEvent, pattern, activePattern, step, song.meta.tempo
        );
        audioEvent.recording = true;
        channel[ step ]      = audioEvent;

        Pubsub.publish( Messages.REFRESH_PATTERN_VIEW ); // ensure we can see the note being added
    }
    else {
        // sequencer isn't playing, add event at current editor step
        // unless it is a noteOff, let the user add it explicitly
        if ( audioEvent.action !== 2 )
            Pubsub.publishSync( Messages.ADD_EVENT_AT_POSITION, [ audioEvent ]);
    }
}

function sanitizeRecordedEvents()
{
    // unflag the recorded state of all the events
    const patterns = efflux.activeSong.patterns;
    let event, i;

    patterns.forEach( pattern =>
    {
        pattern.channels.forEach( events =>
        {
            i = events.length;
            while ( i-- )
            {
                event = events[ i ];
                if ( event )
                    event.recording = false;
            }
        });
    });
}