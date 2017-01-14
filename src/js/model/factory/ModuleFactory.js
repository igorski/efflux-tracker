/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017 - http://www.igorski.nl
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

const AudioFactory = require( "./AudioFactory" );
const ModuleUtil   = require( "../../utils/ModuleUtil" );
const Config       = require( "../../config/Config" );
const Delay        = require( "../../third_party/Delay" );
const Overdrive    = require( "wa-overdrive" );

/* type definitions */

/**
 * @typedef {{
 *              filter: BiquadFilterNode,
 *              lfo: OscillatorNode,
 *              lfoAmp: GainNode,
 *              lfoEnabled: boolean,
 *              filterEnabled: boolean
 *          }}
 */
let FILTER_MODULE;

/**
 * @typedef {{
 *              lowBand: BiquadFilterNode,
 *              midBand: BiquadFilterNode,
 *              highBand: BiquadFilterNode,
 *              lowGain: GainNode,
 *              midGain: GainNode,
 *              highGain: GainNode,
 *              output: GainNode,
 *              eqEnabled: boolean
 *          }}
 */
let EQ_MODULE;

/**
 * @typedef {{
 *              delay: Delay,
 *              delayEnabled: boolean
 *          }}
 */
let DELAY_MODULE;

/**
 * @typedef {{
 *              overdrive: Overdrive
 *              overdriveEnabled: boolean
 *          }}
 */
let OVERDRIVE_MODULE;

module.exports = {

    /**
     * create an equalizer with low/mid/high bands, to change the emphasis
     * of the equalizers frequency range, alter the gain values of the
     * low/mid/high GainNodes to alter the balance
     *
     * @public
     * @param {AudioContext} audioContext
     * @return {EQ_MODULE}
     */
    createEQ( audioContext )
    {
        const hBand           = audioContext.createBiquadFilter();
        hBand.type            = "lowshelf";
        hBand.frequency.value = 360; // TODO make band range configurable?
        hBand.gain.value      = Config.MIN_EQ_GAIN;
        
        const hInvert      = AudioFactory.createGainNode( audioContext );
        hInvert.gain.value = -1.0;
        
        const mBand = AudioFactory.createGainNode( audioContext );
        
        const lBand           = audioContext.createBiquadFilter();
        lBand.type            = "highshelf";
        lBand.frequency.value = 3600; // TODO make band range configurable?
        lBand.gain.value      = Config.MIN_EQ_GAIN;
        
        const lInvert      = AudioFactory.createGainNode( audioContext );
        lInvert.gain.value = -1.0;

        hBand.connect( hInvert );
        lBand.connect( lInvert );

        hInvert.connect( mBand );
        lInvert.connect( mBand );

        const lGain = AudioFactory.createGainNode( audioContext );
        const mGain = AudioFactory.createGainNode( audioContext );
        const hGain = AudioFactory.createGainNode( audioContext );

        lBand.connect( lGain );
        mBand.connect( mGain );
        hBand.connect( hGain );

        const sum = AudioFactory.createGainNode( audioContext );
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
        }
    },

    /**
     * create a filter that can be modulated by a
     * low frequency oscillator
     *
     * @public
     *
     * @param {AudioContext} audioContext
     * @return {FILTER_MODULE}
     */
    createFilter( audioContext )
    {
        const filter = audioContext.createBiquadFilter();
        const lfo    = audioContext.createOscillator();
        const lfoAmp = AudioFactory.createGainNode( audioContext );

        AudioFactory.startOscillation( lfo, audioContext.currentTime );
        lfoAmp.connect( filter.frequency );

        lfo.frequency.value = Config.DEFAULT_FILTER_LFO_SPEED;
        lfoAmp.gain.value   = Config.DEFAULT_FILTER_LFO_DEPTH / 100 * filter.frequency.value;

        filter.frequency.value = Config.DEFAULT_FILTER_FREQ;
        filter.Q.value         = Config.DEFAULT_FILTER_Q;

        return {
            filter        : filter,
            lfo           : lfo,
            lfoAmp        : lfoAmp,
            lfoEnabled    : false,
            filterEnabled : false
        };
    },

    /**
     * @param {AudioContext} audioContext
     * @return {DELAY_MODULE}
     */
    createDelay( audioContext )
    {
        const delay = new Delay( audioContext, {
            type: 0,
            delay: 0.5,
            feedback: 0.42,
            offset: -0.027,
            cutoff: 1200
        });

        return {
            delay: delay,
            delayEnabled: false
        }
    },

    /**
     * @param {Audiocontext} audioContext
     * @return {OVERDRIVE_MODULE}
     */
    createOverdrive( audioContext )
    {
        const overdrive = new Overdrive( audioContext, {
            preBand: 1.0,
            postCut: 8000,
            color: 4000,
            drive: 0.8
        });

        return {
            overdrive: overdrive,
            overdriveEnabled: false
        }
    },

    /**
     * apply a EQ configuration (see INSTRUMENT in InstrumentFactory)
     * onto a EQ module
     *
     * @public
     * @param {INSTRUMENT_MODULES} modules
     * @param {Object} props
     * @param {AudioParam} output
     */
    applyEQConfiguration( modules, props, output )
    {
        const eq = modules.eq;

        eq.eqEnabled           = props.enabled;
        eq.lowGain.gain.value  = props.lowGain;
        eq.midGain.gain.value  = props.midGain;
        eq.highGain.gain.value = props.highGain;

        ModuleUtil.applyRouting( modules, output );
    },

    /**
     * apply a Overdrive configuration onto an Overdrive module
     *
     * @param {INSTRUMENT_MODULES} modules
     * @param {Object} props
     * @param {AudioParam} output
     */
    applyODConfiguration( modules, props, output )
    {
        const overdrive = modules.overdrive;

        overdrive.overdriveEnabled  = props.enabled;
        overdrive.overdrive.color   = props.color;
        overdrive.overdrive.drive   = props.drive;
        overdrive.overdrive.preBand = props.preBand;
        overdrive.overdrive.postCut = props.postCut;

        ModuleUtil.applyRouting( modules, output );
    },

    /**
     * apply a Filter configuration (see INSTRUMENT in InstrumentFactory)
     * onto a Filter module
     *
     * @param {INSTRUMENT_MODULES} modules
     * @param {Object} props
     * @param {AudioParam} output
     */
    applyFilterConfiguration( modules, props, output )
    {
        const filter        = modules.filter;
        const filterEnabled = ( props.lfoType !== "off" );

        filter.filter.frequency.value = props.frequency;
        filter.filter.Q.value         = props.q;

        filter.lfo.frequency.value    = props.speed;
        filter.lfoAmp.gain.value      = props.depth / 100 * props.frequency;

        if ( filterEnabled )
            filter.lfo.type = props.lfoType;

        filter.filter.type   = props.type;
        filter.filterEnabled = props.enabled;

        ModuleUtil.applyRouting( modules, output );

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
     *
     * @param {INSTRUMENT_MODULES} instrumentModule
     * @param {Object} props
     * @param {AudioParam} output
     */
    applyDelayConfiguration( modules, props, output )
    {
        const delay = modules.delay.delay;

        delay.type     = props.type;
        delay.delay    = props.time;
        delay.feedback = props.feedback;
        delay.offset   = props.offset;
        delay.cutoff   = props.cutoff;

        modules.delay.delayEnabled = props.enabled;
        ModuleUtil.applyRouting( modules, output );
    }
};
