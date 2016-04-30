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
var Delay = require( "../third_party/Delay" );

var ModuleUtil = module.exports =
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
    applyRouting : function( modules, output )
    {
        var moduleOutput = modules.output,
            filter       = modules.filter.filter,
            delay        = modules.delay.delay;

        moduleOutput.disconnect();
        filter.disconnect();
        delay.output.disconnect();

        var route = [], lastModule = moduleOutput;

        if ( modules.filter.filterEnabled )
            route.push( filter );

        if ( modules.delay.delayEnabled )
            route.push( delay );

        route.push( output );

        var input;
        route.forEach( function( mod )
        {
            input = ( mod instanceof Delay ) ? mod.input : mod; // Delay is special
            lastModule.connect( input );
            lastModule = ( mod instanceof Delay ) ? mod.output : mod;
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
     * @param {Array.<EVENT_OBJECT>} instrumentEvents events currently playing back for this instrument
     * @param {number} startTimeInSeconds
     */
    applyModuleParamChange : function( audioEvent, modules, instrumentEvents, startTimeInSeconds )
    {
        switch ( audioEvent.mp.module )
        {
            // gain effects
            case "volume":
                applyVolumeEnvelope( audioEvent, instrumentEvents, startTimeInSeconds, 0 );
                break;

            case "fade":
                applyVolumeEnvelope( audioEvent, instrumentEvents, startTimeInSeconds, audioEvent.seq.mpLength );
                break;

            // pitch effects
            case "pitchUp":
            case "pitchDown":
                applyPitchShift( audioEvent, instrumentEvents, startTimeInSeconds, 0 );
                break;

            case "glideUp":
            case "glideDown":
                applyPitchShift( audioEvent, instrumentEvents, startTimeInSeconds, audioEvent.seq.mpLength );
                break;
        }
    }
};

/* private methods */

function applyVolumeEnvelope( audioEvent, instrumentEvents, startTimeInSeconds, durationInSeconds )
{
    var doGlide = ( typeof durationInSeconds === "number" && durationInSeconds > 0 ),
        mp = audioEvent.mp, i, j, event, voice, amp, target;

    i = instrumentEvents.length;

    while ( i-- ) {

        event = instrumentEvents[ i ];

        if ( event ) {

            j = event.length;

            while ( j-- ) {

                voice  = event[ j ];
                amp    = voice.gain.gain;
                target = mp.value / 100;

                if ( !doGlide || !voice.glide ) {
                    amp.cancelScheduledValues( startTimeInSeconds );
                    amp.setValueAtTime(( doGlide ) ? amp.value : target, startTimeInSeconds );
                }

                if ( doGlide ) {
                    amp.linearRampToValueAtTime( target, startTimeInSeconds + durationInSeconds );
                    voice.glide = true;
                }
            }
        }
    }
}

function applyPitchShift( audioEvent, instrumentEvents, startTimeInSeconds, durationInSeconds )
{
    var doGlide = ( typeof durationInSeconds === "number" && durationInSeconds > 0 ),
        mp      = audioEvent.mp,
        goingUp = ( mp.module === "pitchUp" || mp.module === "glideUp" ),
        i, j, event, voice, freq, tmp, target;

    i = instrumentEvents.length;

    while ( i-- ) {

        event = instrumentEvents[ i ];

        if ( event ) {

            j = event.length;

            while ( j-- ) {

                voice = event[ j ];
                freq  = voice.oscillator.frequency;

                tmp    = voice.frequency + ( voice.frequency / 1200 ); // 1200 cents == octave
                target = ( tmp * ( mp.value / 100 ));

                if ( goingUp )
                    target += voice.frequency;
                else
                    target = voice.frequency - ( target / 2 );

                if ( !doGlide || !voice.glide ) {
                    freq.cancelScheduledValues( startTimeInSeconds );
                    freq.setValueAtTime(( doGlide ) ? freq.value : target, startTimeInSeconds );
                }

                if ( doGlide ) {
                    freq.linearRampToValueAtTime( target, startTimeInSeconds + durationInSeconds );
                    voice.glide = true;
                }
            }
        }
    }
}
