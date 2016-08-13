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

const EventFactory = require( "../model/factory/EventFactory" );
const EventUtil    = require( "./EventUtil" );
const Pubsub       = require( "pubsub-js" );
const Messages     = require( "../definitions/Messages" );

let playingNotes = {};

const InstrumentUtil = module.exports =
{
    /**
     * tune given frequency to given oscillators tuning
     *
     * @public
     *
     * @param {number} frequency in Hz
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     * @return {number} tuned frequency in Hz
     */
    tuneToOscillator( frequency, oscillator )
    {
        // tune event frequency to oscillator tuning

        const tmpFreq = frequency + ( frequency / 1200 * oscillator.detune ); // 1200 cents == octave
        let outFreq = tmpFreq;

        if ( oscillator.octaveShift !== 0 )
        {
            if ( oscillator.octaveShift < 0 )
                outFreq = tmpFreq / Math.abs( oscillator.octaveShift * 2 );
            else
                outFreq += ( tmpFreq * Math.abs( oscillator.octaveShift * 2 ) - 1 );
        }

        const fineShift = ( tmpFreq / 12 * Math.abs( oscillator.fineShift ));

        if ( oscillator.fineShift < 0 )
            outFreq -= fineShift;
         else
            outFreq += fineShift;

        return outFreq;
    },

    /**
     * get a buffer playback speed in the -1 to +1 range
     * for given oscillator tuning
     *
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     * @return {number}
     */
    tuneBufferPlayback( oscillator )
    {
        return 1 + ( oscillator.detune / 50 );
    },

    /**
     * alter the frequency of currently playing events to match changes
     * made to the tuning of given oscillator
     *
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {number} oscillatorIndex
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    adjustEventTunings( events, oscillatorIndex, oscillator )
    {
        let i = events.length,
            event, voice, generator;

        while ( i-- )
        {
            if ( event = events[ i ] ) {

                if ( event.length > oscillatorIndex ) {

                    voice     = event[ oscillatorIndex ];
                    generator = voice.generator;

                    if ( generator instanceof OscillatorNode )
                        generator.frequency.value = InstrumentUtil.tuneToOscillator( voice.frequency, oscillator )

                    else if ( generator instanceof AudioBufferSourceNode )
                        generator.playbackRate.value = InstrumentUtil.tuneBufferPlayback( oscillator );
                }
            }
        }
    },

    /**
     * alter the frequency of currently playing events to match changes
     * made to the tuning of given oscillator
     *
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {number} oscillatorIndex
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    adjustEventVolume( events, oscillatorIndex, oscillator )
    {
        let i = events.length,
            event, voice;

        while ( i-- )
        {
            if ( event = events[ i ] ) {

                if ( event.length > oscillatorIndex ) {

                    voice = event[ oscillatorIndex ];
                    voice.gain.gain.value = oscillator.volume;
                }
            }
        }
    },

    /**
     * alter the wavetable of currently playing events to match
     * changes made to the waveform of given oscillator
     *
     * @public
     *
     * @param {Array.<EVENT_OBJECT>} events
     * @param {number} oscillatorIndex
     * @param {PeriodicWave} table
     */
    adjustEventWaveForms( events, oscillatorIndex, table )
    {
        if ( !( table instanceof PeriodicWave ))
            return;

        let i = events.length, event, generator;

        while ( i-- )
        {
            if ( event = events[ i ] ) {

                if ( event.length > oscillatorIndex ) {

                    if (( generator = event[ oscillatorIndex].generator ) instanceof OscillatorNode )
                        generator.setPeriodicWave( table );
                }
            }
        }
    },

    /**
     * @public
     *
     * @param {{ note: string, octave: number }} pitch
     * @param {INSTRUMENT} instrument to play back the note on
     * @param {boolean=} record whether to record the note into given instruments pattern list
     * @param {SequencerController} sequencerController
     * @return {AUDIO_EVENT|null}
     */
    noteOn( pitch, instrument, record, sequencerController )
    {
        const id = pitchToUniqueId( pitch );

        if ( playingNotes[ id ])
            return null; // note already playing

        const audioEvent  = EventFactory.createAudioEvent( instrument.id );
        audioEvent.note   = pitch.note;
        audioEvent.octave = pitch.octave;
        audioEvent.action = 1; // noteOn

        playingNotes[ id ] = { event: audioEvent, instrument: instrument, recording: ( record === true )};
        Pubsub.publishSync( Messages.NOTE_ON, [ audioEvent, instrument ]);

        if ( record )
            recordEventIntoSong( audioEvent, sequencerController );

        return audioEvent;
    },

    /**
     * @public
     * @param {{ note: string, octave: number }} pitch
     * @param {SequencerController} sequencerController
    */
    noteOff( pitch, sequencerController )
    {
        const id         = pitchToUniqueId( pitch );
        const audioEvent = playingNotes[ id ];

        if ( audioEvent ) {
            Pubsub.publishSync( Messages.NOTE_OFF, [ audioEvent.event, audioEvent.instrument ]);

            if ( audioEvent.recording ) {
                const offEvent = EventFactory.createAudioEvent( audioEvent.instrument.id );
                offEvent.action = 2; // noteOff
                recordEventIntoSong( offEvent, sequencerController );
            }
            audioEvent.event.recording   = false;
           // audioEvent.event.seq.playing = false;
        }
        delete playingNotes[ id ];
    }
};

/* private methods */

function pitchToUniqueId( pitch )
{
    return pitch.note + pitch.octave;
}

function recordEventIntoSong( audioEvent, sequencerController )
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

        // update linked list for AudioEvents
        EventUtil.linkEvent( audioEvent, editorModel.activeInstrument, efflux.activeSong.patterns, efflux.eventList );

        Pubsub.publish( Messages.REFRESH_PATTERN_VIEW ); // ensure we can see the note being added
    }
    else {
        // sequencer isn't playing, add event at current editor step
        // unless it is a noteOff, let the user add it explicitly
        if ( audioEvent.action !== 2 )
            Pubsub.publishSync( Messages.ADD_EVENT_AT_POSITION, [ audioEvent, { newEvent: true } ]);
    }
}
