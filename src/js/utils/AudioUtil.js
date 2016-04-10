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
var AudioFactory = require( "../factory/AudioFactory" );

module.exports =
{
    /**
     * create a WaveTable from given graphPoints Array (a list of
     * y-coordinate points drawn in the UI) and apply it onto the given
     * OscillatorNode oscillator
     *
     * @param {AudioContext} audioContext
     * @param {Array.<number>} graphPoints
     */
    createWaveTableFromGraph : function( audioContext, graphPoints )
    {
        // DFT provided by dsp.js

        var ft = new DFT( graphPoints.length );
        ft.forward( graphPoints );

        return audioContext.createPeriodicWave( ft.real, ft.imag );
    },

    /**
     * creates a silent node that uses the accuracy of the Web Audio
     * clock to strictly time a callback event
     *
     * @public
     *
     * @param {AudioContext} audioContext
     * @param {number} time when the callback should be fired (relative to AudioContext currentTime)
     * @param {!Function} callback function to execute
     * @return {Oscillator}
     */
    createTimer : function( audioContext, time, callback )
    {
        var timer = audioContext.createOscillator();

        timer.onended = callback;

        var noGain = AudioFactory.createGainNode( audioContext );
        timer.connect( noGain );
        noGain.gain.value = 0;
        noGain.connect( audioContext.destination );

        AudioFactory.startOscillation( timer, audioContext.currentTime );
        AudioFactory.stopOscillation ( timer, time );

        return timer;
    },

    /**
     * sound a sine wave at given frequency (can be used for testing)
     *
     * @public
     *
     * @param {AudioContext} audioContext
     * @param {number} frequencyInHertz
     * @param {number=} startTimeInSeconds optional, defaults to current time
     * @param {number=} durationInSeconds optional, defaults to 1 second
     *
     * @return {Oscillator} created Oscillator
     */
    beep : function( audioContext, frequencyInHertz, startTimeInSeconds, durationInSeconds )
    {
        var oscillator = audioContext.createOscillator();
        oscillator.connect( audioContext.destination );

        oscillator.frequency.value = frequencyInHertz;

        if ( typeof startTimeInSeconds !== "number" || startTimeInSeconds === 0 )
            startTimeInSeconds = audioContext.currentTime;

        if ( typeof durationInSeconds !== "number" )
            durationInSeconds = 1;

        // oscillator will start, stop and can be garbage collected after going out of scope

        oscillator.onended = function() {
            oscillator.disconnect();
        };
        AudioFactory.startOscillation( oscillator, startTimeInSeconds );
        AudioFactory.stopOscillation ( oscillator, startTimeInSeconds + durationInSeconds );

        return oscillator;
    }
};
