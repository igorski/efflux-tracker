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
import Config from "@/config";
import { rangeToIndex } from "@/utils/array-util";
import { toHex } from "@/utils/number-util";
import { processVoiceLists } from "./audio-util";
import { applyRouting } from "./module-router";
import { createTimer, isOscillatorNode, isAudioBufferSourceNode } from "./webaudio-helper";
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { EventVoice, EventVoiceList } from "@/model/types/event-voice";
import type { Instrument } from "@/model/types/instrument";
import type { InstrumentModules } from "@/model/types/instrument-modules";

const filterTypes = [ "off", "sine", "square", "sawtooth", "triangle" ];

import {
    DELAY_ENABLED, DELAY_FEEDBACK, DELAY_DRY, DELAY_CUTOFF, DELAY_TIME, DELAY_OFFSET,
    EQ_ENABLED, EQ_LOW, EQ_MID, EQ_HIGH,
    FILTER_ENABLED, FILTER_FREQ, FILTER_Q, FILTER_LFO_ENABLED, FILTER_LFO_SPEED, FILTER_LFO_DEPTH,
    OD_ENABLED, OD_DRIVE, OD_PRE_BAND, OD_COLOR, OD_POST_CUT,
    EXTERNAL_EVENT,
    PAN_LEFT, PAN_RIGHT, PITCH_UP, PITCH_DOWN,
    VOLUME
} from "@/definitions/automatable-parameters";

type ExternalEventCallbackProps = { c: number, t: number };
export type ExternalEventCallback = ( props: ExternalEventCallbackProps ) => void;

/**
 * apply a module parameter change defined inside an audioEvent during playback
 */
export const applyModuleParamChange = ( audioContext: BaseAudioContext, audioEvent: EffluxAudioEvent,
    modules: InstrumentModules, instrument: Instrument, voiceLists: EventVoiceList[],
    startTimeInSeconds: number, output: AudioNode, optEventCallback?: ExternalEventCallback ) => {
    const { value, module } = audioEvent.mp;

    switch ( module ) {
        // gain effects
        case VOLUME:
            applyVolumeEnvelope( audioEvent, voiceLists, startTimeInSeconds );
            break;

        // equalizer effects
        case EQ_ENABLED:
            modules.eq.eqEnabled = value >= 50;
            applyRouting( modules, output );
            break;

        case EQ_LOW:
        case EQ_MID:
        case EQ_HIGH:
            applyEQ( audioEvent, modules, startTimeInSeconds );
            break;

        // overdrive effects
        case OD_ENABLED:
            modules.overdrive.overdriveEnabled = value >= 50;
            applyRouting( modules, output );
            break;

        case OD_DRIVE:
        case OD_PRE_BAND:
        case OD_COLOR:
        case OD_POST_CUT:
            applyOverdrive( audioEvent, modules/*, startTimeInSeconds*/ );
            break;

        // panning effects
        case PAN_LEFT:
        case PAN_RIGHT:
            applyPanning( audioEvent, modules, startTimeInSeconds );
            break;

        // pitch effects
        case PITCH_UP:
        case PITCH_DOWN:
            applyPitchShift( audioEvent, voiceLists, startTimeInSeconds );
            break;

        // filter effects
        case FILTER_ENABLED:
            modules.filter.filterEnabled = value >= 50;
            applyRouting( modules, output );
            break;

        case FILTER_LFO_ENABLED:
            instrument.filter.lfoType = rangeToIndex( filterTypes, value );
            applyRouting( modules, output );
            break;

        case FILTER_FREQ:
        case FILTER_Q:
        case FILTER_LFO_SPEED:
        case FILTER_LFO_DEPTH:
            applyFilter( audioEvent, modules, startTimeInSeconds );
            break;

        // delay effects
        case DELAY_ENABLED:
            modules.delay.delayEnabled = value >= 50;
            applyRouting( modules, output );
            break;

        case DELAY_TIME:
        case DELAY_FEEDBACK:
        case DELAY_DRY:
        case DELAY_CUTOFF:
        case DELAY_OFFSET:
            applyDelay( audioEvent, modules/*, startTimeInSeconds*/ );
            break;

        // external events
        case EXTERNAL_EVENT:
            applyExternalEvent( audioContext, audioEvent, startTimeInSeconds, optEventCallback );
            break;
    }
};

/* internal methods */

function applyVolumeEnvelope( audioEvent: EffluxAudioEvent, voiceLists: EventVoiceList[], startTimeInSeconds: number ): void {
    const mp = audioEvent.mp;
    const doGlide = mp.glide;
    const durationInSeconds = audioEvent.seq.mpLength;
    const target = ( mp.value / 100 );

    processVoiceLists( voiceLists, ( voice: EventVoice ): void => {
        scheduleParameterChange(
            voice.gain.gain, target, startTimeInSeconds, durationInSeconds, doGlide, voice
        );
    });
}

function applyPitchShift( audioEvent: EffluxAudioEvent, voiceLists: EventVoiceList[], startTimeInSeconds: number ): void {
    const mp = audioEvent.mp;
    const doGlide = mp.glide;
    const durationInSeconds = audioEvent.seq.mpLength;
    const goingUp = ( mp.module === PITCH_UP );

    let tmp: number;
    let target: number;

    processVoiceLists( voiceLists, ( voice: EventVoice ): void => {
        if ( isOscillatorNode( voice.generator )) {
            const generator = voice.generator as OscillatorNode;
            tmp    = voice.frequency + ( voice.frequency / 1200 ); // 1200 cents == octave
            target = ( tmp * ( mp.value / 100 ));

            if ( goingUp ) {
                target += voice.frequency;
            } else {
                target = voice.frequency - ( target / 2 );
            }
            scheduleParameterChange(
                generator.frequency, target, startTimeInSeconds, durationInSeconds, doGlide, voice
            );
        }
        else if ( isAudioBufferSourceNode( voice.generator )) {
            const generator = voice.generator as AudioBufferSourceNode;
            tmp = ( mp.value / 100 );
            target = ( goingUp ) ? generator.playbackRate.value + tmp : generator.playbackRate.value - tmp;
            scheduleParameterChange(
                generator.playbackRate, target, startTimeInSeconds, durationInSeconds, doGlide, voice
            );
        }
    });
}

function applyPanning( audioEvent: EffluxAudioEvent, modules: InstrumentModules, startTimeInSeconds: number ): void {
    const mp = audioEvent.mp;
    const doGlide = mp.glide;
    const durationInSeconds = audioEvent.seq.mpLength;
    const target = ( mp.value / 100 );

    scheduleParameterChange(
        modules.panner.pan,
        mp.module === PAN_LEFT ? -target : target,
        startTimeInSeconds, durationInSeconds, doGlide
    );
}

function applyEQ( audioEvent: EffluxAudioEvent, modules: InstrumentModules, startTimeInSeconds: number ): void {
    const mp = audioEvent.mp;
    const doGlide = mp.glide;
    const durationInSeconds = audioEvent.seq.mpLength;
    const module = modules.eq;
    const target = ( mp.value / 100 );

    switch ( mp.module ) {
        case EQ_LOW:
            scheduleParameterChange( module.lowGain.gain, target, startTimeInSeconds, durationInSeconds, doGlide );
            break;
        case EQ_MID:
            scheduleParameterChange( module.midGain.gain, target, startTimeInSeconds, durationInSeconds, doGlide );
            break;
        case EQ_HIGH:
            scheduleParameterChange( module.highGain.gain, target, startTimeInSeconds, durationInSeconds, doGlide );
            break;
    }
}

function applyOverdrive( audioEvent: EffluxAudioEvent, modules: InstrumentModules ): void {
    const { value, module } = audioEvent.mp;
    const target = value / 100;

    const { overdrive } = modules.overdrive;

    switch ( module ) {
        case OD_DRIVE:
            overdrive.drive = target;
            break;
        case OD_PRE_BAND:
            overdrive.preBand = target;
            break;
        case OD_COLOR:
            overdrive.color = target * Config.MAX_FILTER_FREQ;
            break;
        case OD_POST_CUT:
            overdrive.postCut = target * Config.MAX_FILTER_FREQ;
            break;
    }
}

function applyFilter( audioEvent: EffluxAudioEvent, modules: InstrumentModules, startTimeInSeconds: number ): void {
    const mp = audioEvent.mp;
    const doGlide = mp.glide;
    const durationInSeconds = audioEvent.seq.mpLength;
    const module = modules.filter;
    const target = ( mp.value / 100 );

    switch ( mp.module ) {
        case FILTER_FREQ:
            scheduleParameterChange( module.filter.frequency, target * Config.MAX_FILTER_FREQ, startTimeInSeconds, durationInSeconds, doGlide );
            break;
        case FILTER_Q:
            scheduleParameterChange( module.filter.Q, target * Config.MAX_FILTER_Q, startTimeInSeconds, durationInSeconds, doGlide );
            break;
        case FILTER_LFO_SPEED:
            scheduleParameterChange( module.lfo.frequency, target * Config.MAX_FILTER_LFO_SPEED, startTimeInSeconds, durationInSeconds, doGlide );
            break;
        case FILTER_LFO_DEPTH:
            scheduleParameterChange( module.lfoAmp.gain,
                ( target * Config.MAX_FILTER_LFO_DEPTH ) / 100 * module.filter.frequency.value,
                startTimeInSeconds, durationInSeconds, doGlide
            );
            break;
    }
}

function applyDelay( audioEvent: EffluxAudioEvent, modules: InstrumentModules ): void {
    const mp = audioEvent.mp
    const module = modules.delay.delay;
    const target = ( mp.value / 100 );

    switch ( mp.module ) {
        case DELAY_TIME:
            module.delay = target; // 0 - 1 range
            break;
        case DELAY_FEEDBACK:
            module.feedback = target; // 0 - 1 range
            break;
        case DELAY_DRY:
            module.dry = target; // 0 - 1 range
            break;
        case DELAY_CUTOFF:
            module.cutoff = target * Config.MAX_DELAY_CUTOFF;
            break;
        case DELAY_OFFSET:
            module.offset = Config.MIN_DELAY_OFFSET + target; // -0.5 - 0.5 range
            break;
    }
}

function applyExternalEvent( audioContext: BaseAudioContext, event: EffluxAudioEvent,
    startTimeInSeconds: number, eventCallback?: ExternalEventCallback ): void {
    if ( !eventCallback ) {
        return;
    }
    createTimer( audioContext, startTimeInSeconds, (): void => {
       
        // note that within Efflux values are scaled to percentile, so here
        // we convert the model value to the same on-screen hexadecimal value

        eventCallback({ c: parseInt(`0x${toHex(event.mp.value)}`, 16), t: startTimeInSeconds });
    });
}

/**
 * @param {AudioParam} param the AudioParam whose value to change
 * @param {number} value the target value for the AudioParam
 * @param {number} startTimeInSeconds relative to the currentTime of the AudioContext, when the change should take place
 * @param {number=} durationInSeconds the total duration of the change (only rqeuired when 'doGlide' is true)
 * @param {boolean=} doGlide whether to "glide" to the value (linear change), defaults to false for instant change
 * @param {Object=} data optional data Object to track the status of the scheduled parameter changes (can for instance
 *                  be EventVoiceList which shouldn't cancel previously scheduled changes upon repeated invocation)
 */
function scheduleParameterChange( param: AudioParam, value: number, startTimeInSeconds: number,
    durationInSeconds: number, doGlide?: boolean, data?: any ): void {

    if ( !doGlide || ( data && !data.gliding )) {
        param.cancelScheduledValues( startTimeInSeconds );
        param.setValueAtTime(( doGlide ) ? param.value : value, startTimeInSeconds );
    }
    if ( doGlide ) {
        param.linearRampToValueAtTime( value, startTimeInSeconds + durationInSeconds );
        if ( data ) {
            data.gliding = true;
        }
    }
}
