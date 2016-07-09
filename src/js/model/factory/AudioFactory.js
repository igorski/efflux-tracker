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

const Config     = require( "../../config/Config" );
const Delay      = require( "../../third_party/Delay" );
const ModuleUtil = require( "../../utils/ModuleUtil" );

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
 *              delay: Delay,
 *              delayEnabled: boolean
 *          }}
 */
let DELAY_MODULE;

/* private properties */

const isStandards = !!( "AudioContext" in window );

/**
 * AudioFactory provides wrapper methods to overcome
 * differences in AudioContext implementations across browsers
 */
const AudioFactory = module.exports =
{
    /**
     * @public
     *
     * @param {OscillatorNode} aOscillator
     * @param {number} aValue time value when to start
     */
    startOscillation( aOscillator, aValue )
    {
        if ( isStandards )
            aOscillator.start( aValue );
        else
            aOscillator.noteOn( aValue );
    },

    /**
     * @public
     *
     * @param {OscillatorNode} aOscillator
     * @param {number} aValue time value when to stop
     */
    stopOscillation( aOscillator, aValue )
    {
        try {

            if ( isStandards)
                aOscillator.stop( aValue );
            else
                aOscillator.noteOff( aValue );
        }
        catch ( e ) {} // likely Safari DOM Exception 11 if oscillator was previously stopped
    },
    
    /**
     * @public
     *
     * @param {webkitAudioContext|AudioContext} aContext
     * @return {AudioGainNode}
     */
    createGainNode( aContext )
    {
        if ( isStandards )
            return aContext.createGain();

        return aContext.createGainNode();
    },

    /**
     * @public
     *
     * @param {webkitAudioContext|AudioContext} aContext
     * @param {number=} aMaxDelayTime
     *
     * @return {DelayNode}
     */
    createDelayNode( aContext, aMaxDelayTime )
    {
        let delay;

        if ( isStandards)
            delay = aContext.createDelay();
        else
            delay = aContext.createDelayNode();

        if ( typeof aMaxDelayTime === "number" )
            delay.delayTime.value = aMaxDelayTime;

        return delay;
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
     * @param {AudioContext} audioContext
     * @return {DELAY_MODULE}
     */
    createDelay( audioContext )
    {
        const delay = new Delay( audioContext,
        {
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
     * apply a Delay configuration (see INSTRUMENT in InstrumentFactory)
     * onto a Delay module
     *
     * @param {Object} instrumentModule
     * @param {Object} props
     * @param {AudioParam} output
     */
    applyDelayConfiguration( instrumentModule, props, output )
    {
        const delay = instrumentModule.delay.delay;

        delay.type     = props.type;
        delay.delay    = props.time;
        delay.feedback = props.feedback;
        delay.offset   = props.offset;
        delay.cutoff   = props.cutoff;
        instrumentModule.delay.delayEnabled = props.enabled;

        ModuleUtil.applyRouting( instrumentModule, output );
    }
};
