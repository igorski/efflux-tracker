/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
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
import AudioService from '@/services/audio-service';
import EventFactory from '@/model/factories/event-factory';
import EventUtil    from './event-util';
import { ACTION_IDLE, ACTION_NOTE_ON, ACTION_NOTE_OFF } from '@/model/types/audio-event-def';
import { isOscillatorNode, isAudioBufferSourceNode } from '@/services/audio/webaudio-helper';
import { getParamRange, applyParamChange } from "@/definitions/param-ids";

const RECORD_THRESHOLD = 50;

let playingNotes = {};
let lastAddition = 0;

/**
 * tune given frequency to given oscillators tuning
 *
 * @param {number} frequency in Hz
 * @param {INSTRUMENT_OSCILLATOR} oscillator
 * @return {number} tuned frequency in Hz
 */
export const tuneToOscillator = ( frequency, oscillator ) => {
    // tune event frequency to oscillator tuning
    const tmpFreq = frequency + ( frequency / 1200 * oscillator.detune ); // 1200 cents == octave
    let outFreq = tmpFreq;

    if ( oscillator.octaveShift !== 0 ) {
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
};

/**
 * get a buffer playback speed in the -1 to +1 range
 * for given oscillator tuning
 *
 * @param {INSTRUMENT_OSCILLATOR} oscillator
 * @return {number}
 */
export const tuneBufferPlayback = oscillator => 1 + ( oscillator.detune / 50 );

/**
 * alter the frequency of currently playing events to match changes
 * made to the tuning of given oscillator
 *
 * @param {Array<EVENT_VOICE_LIST>} events
 * @param {number} oscillatorIndex
 * @param {INSTRUMENT_OSCILLATOR} oscillator
 */
export const adjustEventTunings = ( events, oscillatorIndex, oscillator ) => {
    events.forEach(event => {
        if (!event)
            return;

        if ( event.length > oscillatorIndex ) {
            const voice = event[ oscillatorIndex ];
            if (!voice) return;

            const generator = voice.generator;

            if ( isOscillatorNode( generator ))
                generator.frequency.value = tuneToOscillator( voice.frequency, oscillator );

            else if ( isAudioBufferSourceNode( generator ))
                generator.playbackRate.value = tuneBufferPlayback( oscillator );
        }
    });
};

/**
 * alter the volume of currently playing events to match changes
 * made to the volume of given oscillator
 *
 * @param {Array<EVENT_VOICE_LIST>} events
 * @param {number} oscillatorIndex
 * @param {INSTRUMENT_OSCILLATOR} oscillator
 */
export const adjustEventVolume = ( events, oscillatorIndex, oscillator ) => {
    events.forEach(event => {
        if (!event)
            return;

        if ( event.length > oscillatorIndex ) {
            const voice = event[ oscillatorIndex ];
            if (!voice) return;
            voice.gain.gain.value = oscillator.volume;
        }
    });
};

/**
 * alter the wavetable of currently playing events to match
 * changes made to the waveform of given oscillator
 *
 * @param {Array<EVENT_VOICE_LIST>} events
 * @param {number} oscillatorIndex
 * @param {PeriodicWave} table
 */
export const adjustEventWaveForms = ( events, oscillatorIndex, table ) => {
    if ( !( table instanceof PeriodicWave ))
        return;

    events.forEach(event => {
        if (!event) return;

        if ( event.length > oscillatorIndex ) {
            const voice = event[ oscillatorIndex ];
            if (!voice) return;

            const generator = event[oscillatorIndex].generator;
            if ( isOscillatorNode( generator )) {
                generator.setPeriodicWave(table);
            }
        }
    });
};

export default
{
    tuneBufferPlayback,
    tuneToOscillator,
    adjustEventWaveForms,
    adjustEventVolume,
    adjustEventTunings,

    /**
     * handle the instruments "key down" event (will trigger noteOn)
     * @param {{ note: string, octave: number }} pitch
     * @param {INSTRUMENT} instrument to play back the note on
     * @param {boolean=} record whether to record the note into given instruments pattern list
     * @param {Object} store root Vuex store
     * @return {AUDIO_EVENT|null}
     */
    onKeyDown( pitch, instrument, record, store ) {
        const id = pitchToUniqueId( pitch );

        if ( playingNotes[ id ])
            return null; // note already playing

        const audioEvent  = EventFactory.createAudioEvent( instrument.index );
        audioEvent.note   = pitch.note;
        audioEvent.octave = pitch.octave;
        audioEvent.action = ACTION_NOTE_ON;

        if ( record ) {
            // if recording is activated, record the event into the song before playback
            recordEventIntoSong( audioEvent, store );
            // because depending on the previous note in the track list, the instrument could have changed !!
            instrument = store.getters.activeSong.instruments[ audioEvent.instrument ];
        }
        playingNotes[ id ] = { audioEvent, instrument, recording: record === true };
        AudioService.noteOn( audioEvent, instrument );

        return audioEvent;
    },
    /**
     * handle the instruments "key up" event (will trigger noteOff)
     * @param {{ note: string, octave: number }} pitch
     * @param {Object} store root Vuex store
     * @return {boolean} whether a note off instruction has been executed
    */
    onKeyUp( pitch, store ) {
        const id     = pitchToUniqueId( pitch );
        const noteVO = playingNotes[ id ];

        if ( noteVO ) {
            AudioService.noteOff( noteVO.audioEvent );

            if ( noteVO.recording ) {
                const offEvent  = EventFactory.createAudioEvent( noteVO.instrument.index );
                offEvent.action = ACTION_NOTE_OFF;
                recordEventIntoSong( offEvent, store, false );
            }
           // audioEvent.event.seq.playing = false;
        }
        delete playingNotes[ id ];
        return !!noteVO;
    },

    /**
     * handle a module parameter change for an instrument module
     *
     * @param {String} paramId the module parameter identifier
     * @param {Number} value the module value in 0 - 1 range
     * @param {Number} instrumentIndex the index of the instrument the paramId's module is attached to
     * @param {boolean=} record whether to record the param change into given instruments pattern list
     * @param {Object} store root Vuex store
     */
    onParamControlChange( paramId, value, instrumentIndex, record, store ) {
        const { min, max } = getParamRange( paramId );
        applyParamChange(
            paramId,
            min + ( max - min ) * value,
            instrumentIndex, store
        );
        if ( record ) {
            const audioEvent = EventFactory.createAudioEvent( instrumentIndex );
            audioEvent.action = ACTION_IDLE;
            audioEvent.mp     = { module: paramId, value: value * 100 };
            recordEventIntoSong( audioEvent, store, false );
        }
    }
};

/* private methods */

function pitchToUniqueId( pitch ) {
    return `${pitch.note}${pitch.octave}`;
}

function recordEventIntoSong( audioEvent, store, markAsRecording = true ) {
    const { state, getters, commit } = store;
    const optData   = { newEvent: true };
    const isNoteOff = audioEvent.action === ACTION_NOTE_OFF;
    const isParamChange = audioEvent.action === ACTION_IDLE;

    // ensure we don't overlap previously recorded notes when
    // frantically playing

    const now = Date.now();
    if (( now - lastAddition ) < RECORD_THRESHOLD ) return;

    const { playing, activePattern } = state.sequencer;
    const { amountOfSteps } = getters;

    // if the sequencer isn't playing, noteOff events must be added explicitly
    // (this noteOff event is the result of a key release)
    if ( isNoteOff && !playing ) {
        return;
    }

    const song         = state.song.activeSong;
    const pattern      = song.patterns[ activePattern ];
    const channelIndex = state.editor.selectedInstrument;
    const channel      = pattern.channels[ channelIndex ];
    const step         = playing ? Math.round( getters.position.step / 64 * amountOfSteps ) % amountOfSteps : state.editor.selectedStep;

    // check if the intended target position of the recording already contains an event

    const existingEvent  = channel[ step ];

    if ( existingEvent ) {
        if ( isNoteOff ) {
            return; // keep existing event as it functions as the kill of the previous event
        }
        if ( isParamChange ) {
            // new event is module parameter change, merge with existing event
            audioEvent.action = existingEvent.action;
            audioEvent.note   = existingEvent.note;
            audioEvent.octave = existingEvent.octave;
        }
        else if ( existingEvent.mp ) {
            // if a new noteOn-event has no action, while the existing event does,
            // retain the existing events module parameter automation
            audioEvent.mp = { ...existingEvent.mp };
        }
    }

    if ( playing ) {
        const prevInCurrentPattern = EventUtil.getFirstEventBeforeStep( channel, step, e => e !== audioEvent );

        // do not record repeated note off instructions

        if ( isNoteOff ) {
            if ( prevInCurrentPattern && prevInCurrentPattern.action === ACTION_NOTE_OFF ) return;
        }

        // sequencer is playing, add event at current step

        optData.patternIndex      = activePattern;
        optData.channelIndex      = channelIndex;
        optData.step              = step;
        optData.advanceOnAddition = false; // don't advanced selected step during playback
        audioEvent.recording = markAsRecording && !isParamChange;
    }
    commit( "addEventAtPosition", { store, event: audioEvent, optData });

    lastAddition = now;

    // unset recording state of previous event
    const previousEvent = EventUtil.getFirstEventBeforeEvent(
        song.patterns, activePattern, channelIndex, audioEvent
    );
    if ( previousEvent ) previousEvent.recording = false;
}
