/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
import type { ModuleParamDef } from "@/definitions/automatable-parameters";

/**
 * type definition for a single AudioEvent
 *
 * "id" is assigned by the AudioService at playback
 *
 * the "action" property is an enumeration describing the action of the note, e.g.:
 * 0 = nothing, 1 = noteOn, 2 = noteOff (kills previous note)
 *
 * the "recording" property describes whether the event is currently being
 * recorded (won't be played back by the Sequencer as it is being
 * played back via the MIDI module)
 *
 * the "seq" Object defines the properties for playback within the
 * Sequencer (the offset and length values are defined in seconds)
 *
 * the "mp" Object is optional
 *
 * @see EventFactory, EventValidator
 */
export type EffluxAudioEvent = {
    id?: number;
    instrument: number;
    note: string;
    octave: number;
    action: number;
    recording: boolean;
    seq: {
        playing: boolean;
        startOffset: number;        // start offset (in seconds) relative to song start
        startMeasure: number;       // index of the measure in which the event starts playback
        startMeasureOffset: number; // offset (in seconds) within the start measure
        endMeasure: number;         // index of the measure in which the event stops playback
        length: number;             // total length (in seconds) of event
        mpLength: number;           // total length (in seconds) of module parameter automation
    },
    mp?: EffluxAudioEventModuleParams;
};

/**
 * defines an optional parameter change action on
 * one of the instruments modules
 */
export type EffluxAudioEventModuleParams = {
    module: ModuleParamDef;
    value: number;
    glide: boolean;
};

// valid actions for event.action

export const ACTION_IDLE      = 0; // no note action / module parameter change event
export const ACTION_NOTE_ON   = 1; // start playing note defined using note and octave
export const ACTION_NOTE_OFF  = 2; // stop playing the note started in a previous event
