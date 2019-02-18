/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2017 - http://www.igorski.nl
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

const Config    = require( "../config/Config" );
const Delay     = require( "../third_party/Delay" );
const ArrayUtil = require( "../utils/ArrayUtil" );
const Messages  = require( "../definitions/Messages" );
const Pubsub    = require( "pubsub-js" );

const ModuleUtil = module.exports =
{
    /**
     * apply the routing for the given instrument modules
     * (e.g. toggling devices on/off and connecting them
     * to the corresponding devices)
     *
     * @public
     *
     * @param {INSTRUMENT_MODULES} modules
     * @param {AudioParam} output
     */
    applyRouting( modules, output )
    {
        const moduleOutput = modules.output,
              eq           = modules.eq,
              overdrive    = modules.overdrive.overdrive,
              filter       = modules.filter.filter,
              delay        = modules.delay.delay;

        moduleOutput.disconnect();
        overdrive.disconnect();
        eq.output.disconnect();
        filter.disconnect();
        delay.output.disconnect();

        const routes   = [];
        let lastOutput = moduleOutput;

        if ( eq.eqEnabled ) {
            lastOutput.connect( eq.lowBand );
            lastOutput.connect( eq.midBand );
            lastOutput.connect( eq.highBand );
            lastOutput = eq.output;
        }

        if ( modules.overdrive.overdriveEnabled )
            routes.push( overdrive );

        if ( modules.filter.filterEnabled )
            routes.push( filter );

        if ( modules.delay.delayEnabled )
            routes.push( delay );

        routes.push( output );

        let input;
        routes.forEach(( mod ) => {

            // some signatures are different here
            // Delay and Overdrive have "input" and "output" GainNodes
            // for any other type of connection (e.g. filter) "mod" is a GainNode

            input = ( mod.input instanceof GainNode ) ? mod.input : mod;
            lastOutput.connect( input );
            lastOutput = ( mod.output instanceof GainNode ) ? mod.output : mod;
        });
    },

    /**
     * apply a module parameter change defined inside an
     * audioEvent during playback
     *
     * @public
     *
     * @param {AUDIO_EVENT} audioEvent
     * @param {INSTRUMENT_MODULES} modules
     * @param {INSTRUMENT} instrument
     * @param {Array.<EVENT_OBJECT>} instrumentEvents events currently playing back for this instrument
     * @param {number} startTimeInSeconds
     * @param {AudioGainNode} output
     */
    applyModuleParamChange( audioEvent, modules, instrument, instrumentEvents, startTimeInSeconds, output )
    {
        switch ( audioEvent.mp.module )
        {
            // gain effects
            case "volume":
                applyVolumeEnvelope( audioEvent, instrumentEvents, startTimeInSeconds );
                break;

            // pitch effects
            case "pitchUp":
            case "pitchDown":
                applyPitchShift( audioEvent, instrumentEvents, startTimeInSeconds );
                break;

            // filter effects
            case "filterEnabled":
                modules.filter.filterEnabled = ( audioEvent.mp.value >= 50 );
                ModuleUtil.applyRouting( modules, output );
                break;

            case "filterLFOEnabled":
                instrument.filter.lfoType = ArrayUtil.rangeToIndex([ "off", "sine", "square", "sawtooth", "triangle" ], audioEvent.mp.value );
                Pubsub.publishSync( Messages.UPDATE_FILTER_SETTINGS, [ instrument.id, instrument.filter ]);
                break;

            case "filterFreq":
            case "filterQ":
            case "filterLFOSpeed":
            case "filterLFODepth":
                applyFilter( audioEvent, modules, startTimeInSeconds );
                break;

            // delay effects
            case "delayEnabled":
                modules.delay.delayEnabled = ( audioEvent.mp.value >= 50 );
                ModuleUtil.applyRouting( modules, output );
                break;

            case "delayTime":
            case "delayFeedback":
            case "delayCutoff":
            case "delayOffset":
                applyDelay( audioEvent, modules, startTimeInSeconds );
                break;
        }
    }
};

/* private methods */

function applyVolumeEnvelope( audioEvent, instrumentEvents, startTimeInSeconds )
{
    const mp = audioEvent.mp, doGlide = mp.glide,
          durationInSeconds = audioEvent.seq.mpLength,
          target = ( mp.value / 100 );

    let i, j, event, voice;

    i = instrumentEvents.length;

    while ( i-- ) {

        event = instrumentEvents[ i ];

        if ( event ) {

            j = event.length;

            while ( j-- ) {

                voice  = event[ j ];

                scheduleParameterChange(
                    voice.gain.gain, target, startTimeInSeconds, durationInSeconds, doGlide, voice
                );
            }
        }
    }
}

function applyPitchShift( audioEvent, instrumentEvents, startTimeInSeconds )
{
    const mp = audioEvent.mp, doGlide = mp.glide,
        durationInSeconds = audioEvent.seq.mpLength,
        goingUp = ( mp.module === "pitchUp" );

    let i, j, event, voice, generator, tmp, target;

    i = instrumentEvents.length;

    while ( i-- ) {

        event = instrumentEvents[ i ];

        if ( event ) {

            j = event.length;

            while ( j-- ) {

                voice = event[ j ];
                generator = voice.generator;

                if ( generator instanceof OscillatorNode ) {

                    tmp    = voice.frequency + ( voice.frequency / 1200 ); // 1200 cents == octave
                    target = ( tmp * ( mp.value / 100 ));

                    if ( goingUp )
                        target += voice.frequency;
                    else
                        target = voice.frequency - ( target / 2 );

                    scheduleParameterChange(
                        generator.frequency, target, startTimeInSeconds, durationInSeconds, doGlide, voice
                    );

                }
                else if ( generator instanceof AudioBufferSourceNode ) {

                    tmp    = ( mp.value / 100 );
                    target = ( goingUp ) ? generator.playbackRate.value + tmp : generator.playbackRate.value - tmp;
                    scheduleParameterChange(
                        generator.playbackRate, target, startTimeInSeconds, durationInSeconds, doGlide, voice
                    );
                }
            }
        }
    }
}

function applyFilter( audioEvent, modules, startTimeInSeconds )
{
    const mp = audioEvent.mp, doGlide = mp.glide,
          durationInSeconds = audioEvent.seq.mpLength,
          module = modules.filter, target = ( mp.value / 100 );

    switch ( mp.module )
    {
        case "filterFreq":
            scheduleParameterChange( module.filter.frequency, target * Config.MAX_FILTER_FREQ, startTimeInSeconds, durationInSeconds, doGlide );
            break;

        case "filterQ":
            scheduleParameterChange( module.filter.Q, target * Config.MAX_FILTER_Q, startTimeInSeconds, durationInSeconds, doGlide );
            break;

        case "filterLFOSpeed":
            scheduleParameterChange( module.lfo.frequency, target * Config.MAX_FILTER_LFO_SPEED, startTimeInSeconds, durationInSeconds, doGlide );
            break;

        case "filterLFODepth":
            scheduleParameterChange( module.lfoAmp.gain,
                ( target * Config.MAX_FILTER_LFO_DEPTH ) / 100 * module.filter.frequency.value,
                startTimeInSeconds, durationInSeconds, doGlide
            );
            break;
    }
}

function applyDelay( audioEvent, modules, startTimeInSeconds )
{
    const mp = audioEvent.mp, module = modules.delay.delay, target = ( mp.value / 100 );

    switch ( mp.module )
    {
        case "delayTime":
            module.delay = target * Config.MAX_DELAY_TIME;
            break;

        case "delayFeedback":
            module.feedback = target * Config.MAX_DELAY_FEEDBACK;
            break;

        case "delayCutoff":
            module.cutoff = target * Config.MAX_DELAY_CUTOFF;
            break;

        case "delayOffset":
            module.offset = target * Config.MAX_DELAY_OFFSET;
            break;
    }
}

/**
 * @param {AudioParam} param the AudioParam whose value to change
 * @param {number} value the target value for the AudioParam
 * @param {number} startTimeInSeconds relative to the currentTime of the AudioContext, when the change should take place
 * @param {number=} durationInSeconds the total duration of the change (only rqeuired when 'doGlide' is true)
 * @param {boolean=} doGlide whether to "glide" to the value (linear change), defaults to false for instant change
 * @param {Object=} data optional data Object to track the status of the scheduled parameter changes (can for instance
 *                  be EVENT_OBJECT which shouldn't cancel previously scheduled changes upon repeated invocation)
 */
function scheduleParameterChange( param, value, startTimeInSeconds, durationInSeconds, doGlide, data )
{
    if ( !doGlide || ( data && !data.gliding )) {

        param.cancelScheduledValues( startTimeInSeconds );
        param.setValueAtTime(( doGlide ) ? param.value : value, startTimeInSeconds );
    }

    if ( doGlide ) {

        param.linearRampToValueAtTime( value, startTimeInSeconds + durationInSeconds );

        if ( data )
            data.gliding = true;
    }
}
