/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
import type { Store } from "vuex";
import type { ModuleParamDef } from "@/definitions/automatable-parameters";
import { getParamRange, applyParamChange } from "@/definitions/param-ids";
import { noteOn, noteOff } from "@/services/audio-service";
import type { PartialPitch } from "@/services/audio/pitch";
import EventFactory from "@/model/factories/event-factory";
import EventUtil from "./event-util";
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import { ACTION_IDLE, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import type { EventVoiceList } from "@/model/types/event-voice";
import type { Instrument, InstrumentOscillator } from "@/model/types/instrument";
import type { Sample } from "@/model/types/sample";
import { isOscillatorNode, isAudioBufferSourceNode } from "@/services/audio/webaudio-helper";
import type { EffluxState } from "@/store";

const RECORD_THRESHOLD = 50;

type NoteDef = {
    audioEvent: EffluxAudioEvent;
    instrument: Instrument;
    recording: boolean;
};

let playingNotes: Record<string, NoteDef> = {};
let lastAddition = 0;

/**
 * tune given frequency to given oscillators tuning (in Hz)
 */
export const tuneToOscillator = ( frequency: number, oscillator: InstrumentOscillator ): number => {
    // tune event frequency to oscillator tuning
    const tmpFreq = frequency + ( frequency / 1200 * oscillator.detune ); // 1200 cents == octave
    let outFreq = tmpFreq;

    if ( oscillator.octaveShift !== 0 ) {
        if ( oscillator.octaveShift < 0 ) {
            outFreq = tmpFreq / Math.abs( oscillator.octaveShift * 2 );
        } else {
            outFreq += ( tmpFreq * Math.abs( oscillator.octaveShift * 2 ) - 1 );
        }
    }
    const fineShift = ( tmpFreq / 12 * Math.abs( oscillator.fineShift ));

    if ( oscillator.fineShift < 0 ) {
        outFreq -= fineShift;
    } else {
        outFreq += fineShift;
    }
    return outFreq;
};

/**
 * shift a buffers playback speed in the -1 to +1 range
 * for given oscillator tuning
 */
export const tuneBufferPlaybackRate = ( node: AudioBufferSourceNode, oscillator: InstrumentOscillator ): void => {
    node.playbackRate.value = 1 + ( oscillator.detune / 50 );
};

/**
 * shift a buffer playback speed in the -1 to +1 range, allowing given sample to play back at a rate leading
 * its pitch to match given frequency (@see sample-editor). Ideally you can use AudioBufferSourceNode.detune
 * but this is not supported in Safari and buggy in Firefox at the moment of writing (Nov '21)
 *
 * Alternatively you can use BiQuadFilterNode.detune but this requires an
 * additional node in the signal path.
 */
export const tuneSamplePitch = ( node: AudioBufferSourceNode, frequency: number, sample: Sample, oscillator: InstrumentOscillator ): void => {
    if ( !sample.pitch ) {
        return; // sample is not pitched, nothing to do here
    }
    /* AudioBufferSourceNode.detune
    const value = intervalToCents( sample.pitch.frequency, frequency );
    node.detune.value = value;
    */
    const value = ( frequency / sample.pitch.frequency ) + ( oscillator.detune / 50 );
    node.playbackRate.value = value;
};

/**
 * alter the frequency of currently playing events to match changes
 * made to the tuning of given oscillator
 */
export const adjustEventTunings = ( voiceLists: EventVoiceList[], oscillatorIndex: number, oscillator: InstrumentOscillator ): void => {
    voiceLists.forEach(( voiceList: EventVoiceList ): void => {
        if ( !voiceList ) {
            return;
        }
        if ( voiceList.length > oscillatorIndex ) {
            const voice = voiceList[ oscillatorIndex ];
            if ( !voice ) {
                return;
            }
            const generator = voice.generator;

            if ( isOscillatorNode( generator )) {
                ( generator as OscillatorNode ).frequency.value = tuneToOscillator( voice.frequency, oscillator );
            } else if ( isAudioBufferSourceNode( generator )) {
                tuneBufferPlaybackRate( generator as AudioBufferSourceNode, oscillator );
            }
        }
    });
};

/**
 * alter the volume of currently playing events to match changes
 * made to the volume of given oscillator
 */
export const adjustEventVolume = ( voiceLists: EventVoiceList[], oscillatorIndex: number, oscillator: InstrumentOscillator ): void => {
    voiceLists.forEach(( voiceList: EventVoiceList ): void => {
        if ( !voiceList ) {
            return;
        }
        if ( voiceList.length > oscillatorIndex ) {
            const voice = voiceList[ oscillatorIndex ];
            if ( !voice ) {
                return;
            }
            voice.gain.gain.value = oscillator.volume;
        }
    });
};

/**
 * alter the wavetable of currently playing events to match
 * changes made to the waveform of given oscillator
 */
export const adjustEventWaveForms = ( voiceLists: EventVoiceList[], oscillatorIndex: number, table: PeriodicWave ): void => {
    if ( !( table instanceof PeriodicWave )) {
        return;
    }
    voiceLists.forEach(( voiceList: EventVoiceList ): void => {
        if ( !voiceList ) {
            return;
        }
        if ( voiceList.length > oscillatorIndex ) {
            const voice = voiceList[ oscillatorIndex ];
            if ( !voice ) {
                return;
            }
            const generator = voiceList[ oscillatorIndex ].generator;
            if ( isOscillatorNode( generator )) {
                ( generator as OscillatorNode ).setPeriodicWave( table );
            }
        }
    });
};

export default
{
    tuneBufferPlaybackRate,
    tuneToOscillator,
    adjustEventWaveForms,
    adjustEventVolume,
    adjustEventTunings,

    /**
     * handle the instruments "key down" event (will trigger noteOn)
     * note: record defines whether to record the note into given instruments pattern list
     */
    onKeyDown( pitch: PartialPitch, instrument: Instrument, store: Store<EffluxState>, record = false ): EffluxAudioEvent | null {
        const id = pitchToUniqueId( pitch );

        if ( playingNotes[ id ]) {
            return null; // note already playing
        }
        const audioEvent  = EventFactory.create( instrument.index );
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
        noteOn( audioEvent, instrument, store.getters.sampleCache );

        return audioEvent;
    },
    /**
     * handle the instruments "key up" event (will trigger noteOff) and return
     * the audio event that responded to the note off instruction
     */
    onKeyUp( pitch: PartialPitch, store: Store<EffluxState> ): EffluxAudioEvent | null {
        const id     = pitchToUniqueId( pitch );
        const noteVO = playingNotes[ id ];

        if ( noteVO ) {
            noteOff( noteVO.audioEvent );

            if ( noteVO.recording ) {
                const offEvent  = EventFactory.create( noteVO.instrument.index );
                offEvent.action = ACTION_NOTE_OFF;
                recordEventIntoSong( offEvent, store, false );
            }
           // audioEvent.event.seq.playing = false;
        }
        delete playingNotes[ id ];
        return noteVO?.audioEvent || null;
    },

    /**
     * handle a module parameter change for an instrument module
     * note: record defines whether to record the param change into given instruments pattern list
     */
    onParamControlChange( paramId: ModuleParamDef, value: number, instrumentIndex: number, store: Store<EffluxState>, record = false ): void {
        const { min, max } = getParamRange( paramId );
        applyParamChange(
            paramId,
            min + ( max - min ) * value,
            instrumentIndex, store
        );
        if ( record ) {
            const audioEvent = EventFactory.create( instrumentIndex );
            audioEvent.action = ACTION_IDLE;
            audioEvent.mp     = { module: paramId, value: value * 100, glide: false };
            recordEventIntoSong( audioEvent, store, false );
        }
    }
};

/* private methods */

function pitchToUniqueId( pitch: PartialPitch ): string {
    return `${pitch.note}${pitch.octave}`;
}

function recordEventIntoSong( audioEvent: EffluxAudioEvent, store: Store<EffluxState>, markAsRecording = true ): void {
    const { state, getters, commit } = store;
    const optData: any = { newEvent: true };
    const isNoteOff = audioEvent.action === ACTION_NOTE_OFF;
    const isParamChange = audioEvent.action === ACTION_IDLE;

    // ensure we don't overlap previously recorded notes when
    // frantically playing

    const now = Date.now();
    if (( now - lastAddition ) < RECORD_THRESHOLD ) return;

    const { playing } = state.sequencer;
    const { activePatternIndex, amountOfSteps } = getters;

    // if the sequencer isn't playing, noteOff events must be added explicitly
    // (this noteOff event is the result of a key release)
    if ( isNoteOff && !playing ) {
        return;
    }

    const song         = state.song.activeSong;
    const pattern      = song.patterns[ activePatternIndex ];
    const channelIndex = state.editor.selectedInstrument;
    const channel      = pattern.channels[ channelIndex ];
    const step         = playing ? Math.round( state.sequencer.currentStep / 64 * amountOfSteps ) % amountOfSteps : state.editor.selectedStep;

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

        optData.patternIndex      = activePatternIndex;
        optData.channelIndex      = channelIndex;
        optData.step              = step;
        optData.advanceOnAddition = false; // don't advanced selected step during playback
        audioEvent.recording = markAsRecording && !isParamChange;
    }
    commit( "addEventAtPosition", { store, event: audioEvent, optData });

    lastAddition = now;

    // unset recording state of previous event
    const previousEvent = EventUtil.getFirstEventBeforeEvent(
        song.patterns, activePatternIndex, channelIndex, audioEvent
    );
    if ( previousEvent ) previousEvent.recording = false;
}
