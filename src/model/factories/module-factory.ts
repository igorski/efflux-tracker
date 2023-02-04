/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017-2022 - https://www.igorski.nl
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
import { createGainNode, startOscillation } from "@/services/audio/webaudio-helper";
import { applyRouting } from "@/services/audio/module-router";
import type { InstrumentModules } from "@/model/types/instrument-modules";
import type { EqModule, FilterModule, DelayModule, OverdriveModule } from "@/model/types/audio-modules";
import Config from "@/config";
import Delay from "@/services/audio/modules/delay-module";
// @ts-expect-error has no module definitions
import Overdrive from "wa-overdrive";

const ModuleFactory = {
    /**
     * Factory method to apply changes to an existing module chain
     */
    applyConfiguration( moduleType: string, modules: InstrumentModules, props: any, output: AudioNode ): void {
        switch ( moduleType ) {
            default:
                if ( process.env.NODE_ENV === "development" ) {
                    throw new Error( `unknown module "${moduleType}" in ModuleFactory` );
                }
                break;
            case "filter":
                return ModuleFactory.applyFilterConfiguration( modules, props, output );
            case "delay":
                return ModuleFactory.applyDelayConfiguration( modules, props, output );
            case "eq":
                return ModuleFactory.applyEQConfiguration( modules, props, output );
            case "overdrive":
                return ModuleFactory.applyODConfiguration( modules, props, output );
        }
    },
    /**
     * create an equalizer with low/mid/high bands, to change the emphasis
     * of the equalizers frequency range, alter the gain values of the
     * low/mid/high GainNodes to alter the balance
     */
    createEQ( audioContext: BaseAudioContext ): EqModule {
        const hBand           = audioContext.createBiquadFilter();
        hBand.type            = "lowshelf";
        hBand.frequency.value = 360; // TODO make band range configurable?
        hBand.gain.value      = Config.MIN_EQ_GAIN;

        const hInvert      = createGainNode( audioContext );
        hInvert.gain.value = -1.0;

        const mBand = createGainNode( audioContext );

        const lBand           = audioContext.createBiquadFilter();
        lBand.type            = "highshelf";
        lBand.frequency.value = 3600; // TODO make band range configurable?
        lBand.gain.value      = Config.MIN_EQ_GAIN;

        const lInvert      = createGainNode( audioContext );
        lInvert.gain.value = -1.0;

        hBand.connect( hInvert );
        lBand.connect( lInvert );

        hInvert.connect( mBand );
        lInvert.connect( mBand );

        const lGain = createGainNode( audioContext );
        const mGain = createGainNode( audioContext );
        const hGain = createGainNode( audioContext );

        lBand.connect( lGain );
        mBand.connect( mGain );
        hBand.connect( hGain );

        const sum = createGainNode( audioContext );
        lGain.connect( sum );
        mGain.connect( sum );
        hGain.connect( sum );

        return {
            lowBand   : lBand,
            midBand   : mBand,
            highBand  : hBand,
            lowGain   : lGain,
            midGain   : mGain,
            highGain  : hGain,
            output    : sum,
            eqEnabled : false
        };
    },
    /**
     * create a filter that can be modulated by a
     * low frequency oscillator
     */
    createFilter( audioContext: BaseAudioContext ): FilterModule {
        const filter = audioContext.createBiquadFilter();
        const lfo    = audioContext.createOscillator();
        const lfoAmp = createGainNode( audioContext );

        startOscillation( lfo, audioContext.currentTime );
        lfoAmp.connect( filter.frequency );

        lfo.frequency.value = Config.DEFAULT_FILTER_LFO_SPEED;
        lfoAmp.gain.value   = Config.DEFAULT_FILTER_LFO_DEPTH / 100 * filter.frequency.value;

        filter.frequency.value = Config.DEFAULT_FILTER_FREQ;
        filter.Q.value         = Config.DEFAULT_FILTER_Q;

        return {
            filter,
            lfo,
            lfoAmp,
            lfoEnabled    : false,
            filterEnabled : false
        };
    },
    createDelay( audioContext: BaseAudioContext ): DelayModule {
        return {
            delay: new Delay( audioContext, {
                type: 0,
                delay: 0.5,
                feedback: 0.42,
                offset: -0.027,
                cutoff: 1200,
                dry: 1,
            }),
            delayEnabled: false
        };
    },
    createOverdrive( audioContext: BaseAudioContext ): OverdriveModule {
        return {
            overdrive: new Overdrive( audioContext, {
                preBand: 1.0,
                postCut: 8000,
                color: 4000,
                drive: 0.8
            }),
            overdriveEnabled: false
        };
    },
    /**
     * apply a EQ configuration (see INSTRUMENT in InstrumentFactory)
     * onto a EQ module
     */
    applyEQConfiguration( modules: InstrumentModules, props: any, output: AudioNode ): void {
        const { eq } = modules;

        eq.eqEnabled           = props.enabled;
        eq.lowGain.gain.value  = props.lowGain;
        eq.midGain.gain.value  = props.midGain;
        eq.highGain.gain.value = props.highGain;

        applyRouting( modules, output );
    },
    /**
     * apply a Overdrive configuration onto an Overdrive module
     */
    applyODConfiguration( modules: InstrumentModules, props: any, output: AudioNode ): void {
        const { overdrive } = modules;

        overdrive.overdriveEnabled  = props.enabled;
        overdrive.overdrive.color   = props.color;
        overdrive.overdrive.drive   = props.drive;
        overdrive.overdrive.preBand = props.preBand;
        overdrive.overdrive.postCut = props.postCut;

        applyRouting( modules, output );
    },
    /**
     * apply a Filter configuration (see INSTRUMENT in InstrumentFactory)
     * onto a Filter module
     */
    applyFilterConfiguration( modules: InstrumentModules, props: any, output: AudioNode ): void {
        const { filter }    = modules;
        const filterEnabled = ( props.lfoType !== "off" );

        filter.filter.frequency.value = props.frequency;
        filter.filter.Q.value         = props.q;

        filter.lfo.frequency.value    = props.speed;
        filter.lfoAmp.gain.value      = props.depth / 100 * props.frequency;

        if ( filterEnabled )
            filter.lfo.type = props.lfoType;

        filter.filter.type   = props.type;
        filter.filterEnabled = props.enabled;

        applyRouting( modules, output );

        if ( filterEnabled )
        {
            if ( !filter.lfoEnabled ) {
                filter.lfo.connect( filter.lfoAmp );
                filter.lfoEnabled = true;
            }
        }
        else if ( filter.lfoEnabled )
        {
            filter.lfoEnabled = false;

            // we must dis- and reconnect to ensure the next noteOn works!
            // (AudioBufferSourceNode can only be played once)

            filter.lfo.disconnect();
        }
    },
    /**
     * apply a Delay configuration (see INSTRUMENT in InstrumentFactory)
     * onto a Delay module
     */
    applyDelayConfiguration( modules: InstrumentModules, props: any, output: AudioNode ): void {
        const { delay } = modules.delay;

        delay.type     = props.type;
        delay.feedback = props.feedback;
        delay.dry      = props.dry;
        delay.cutoff   = props.cutoff;
        delay.delay    = props.time;
        delay.offset   = props.offset; // should come after delay time

        modules.delay.delayEnabled = props.enabled;
        applyRouting( modules, output );
    }
};
export default ModuleFactory;
