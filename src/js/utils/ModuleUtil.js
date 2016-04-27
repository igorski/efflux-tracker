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

/**
 * apply a module parameter change defined inside an
 * audioEvent during playback
 *
 * @public
 *
 * @param {AUDIO_EVENT} audioEvent
 * @param {Array.<EVENT_OBJECT>} instrumentEvents events currently playing back for this instrument
 * @param {number} startTimeInSeconds
 * @param {number=} durationInSeconds optional duration, when undefined changes occur instantly at given startTimeInSeconds
 */
function applyPitchShift( audioEvent, instrumentEvents, startTimeInSeconds, durationInSeconds )
{
    var mp = audioEvent.mp, i, j, event, voice;
    var hasDuration = ( typeof durationInSeconds === "number" && durationInSeconds > 0 );

    i = instrumentEvents.length;

    while ( i-- ) {

        event = instrumentEvents[ i ];

        if ( event ) {

            j = event.length;

            while ( j-- ) {

                voice = event[ j ];

                var goingUp = ( mp.module === "pitchUp" || mp.module === "glideUp" );
                var tmp     = voice.frequency + ( voice.frequency / 1200 ); // 1200 cents == octave
                var target  = ( tmp * ( mp.value / 100 ));

                if ( goingUp )
                    target += voice.frequency;
                else
                    target = voice.frequency - ( target / 2 );

                var freq = voice.oscillator.frequency;

                if ( !hasDuration ) {
                    freq.cancelScheduledValues( startTimeInSeconds );
                    freq.setValueAtTime(( hasDuration ) ? freq.value : target, startTimeInSeconds );
                }
                else
                    freq.linearRampToValueAtTime( target, startTimeInSeconds + durationInSeconds );
            }
        }
    }
}
