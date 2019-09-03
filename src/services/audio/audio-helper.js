/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
 * THE SOFTWARE IS PROVIDED "AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import AudioFactory from '../../model/factory/audio-factory';
const d = window.document;
const features = {
    panning: false
};

export default
{
    /**
     * create a WaveTable from given graphPoints Array (a list of
     * y-coordinate points drawn in the UI) and apply it onto the given
     * OscillatorNode oscillator
     *
     * @public
     *
     * @param {AudioContext} audioContext
     * @param {Array.<number>} graphPoints
     * @return {PeriodicWave}
     */
    createWaveTableFromGraph( audioContext, graphPoints ) {
        // DFT provided by dsp.js

        const dft = new window["DFT"]( graphPoints.length );
        dft.forward( graphPoints );

        return audioContext.createPeriodicWave( dft.real, dft.imag );
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
     * @return {OscillatorNode}
     */
    createTimer( audioContext, time, callback ) {
        const timer = audioContext.createOscillator();

        timer.onended = callback;

        const noGain = AudioFactory.createGainNode( audioContext );
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
     * @return {OscillatorNode} created Oscillator
     */
    beep( audioContext, frequencyInHertz, startTimeInSeconds, durationInSeconds ) {
        const oscillator = audioContext.createOscillator();
        oscillator.connect( audioContext.destination );

        oscillator.frequency.value = frequencyInHertz;

        if ( typeof startTimeInSeconds !== 'number' || startTimeInSeconds === 0 )
            startTimeInSeconds = audioContext.currentTime;

        if ( typeof durationInSeconds !== 'number' )
            durationInSeconds = 1;

        // oscillator will start, stop and can be garbage collected after going out of scope

        oscillator.onended = () => oscillator.disconnect();

        AudioFactory.startOscillation( oscillator, startTimeInSeconds );
        AudioFactory.stopOscillation ( oscillator, startTimeInSeconds + durationInSeconds );

        return oscillator;
    },
    /**
     * On mobile (and an increasing number of desktop environments) all audio is muted
     * unless the engine has been initialized directly after a user interaction.
     * This method will lazily create the AudioContext on the first click/touch/
     * keyboard interaction.
     *
     * @return {Promise} with generated AudioContext
     */
    init() {
        return new Promise((resolve, reject) => {
            let audioContext;
            const handler = () => {
                d.removeEventListener('click',   handler, false);
                d.removeEventListener('keydown', handler, false);

                if ( typeof window.AudioContext !== 'undefined' ) {
                    audioContext = new window.AudioContext();
                }
                else if ( typeof window.webkitAudioContext !== 'undefined' ) {
                    audioContext = new window.webkitAudioContext();
                }
                else {
                    reject(new Error('WebAudio API not supported'));
                    return;
                }

                // not all environments support the same features
                // within the AudioContext, check them here

                features.panning = typeof audioContext.createStereoPanner === 'function';

                resolve(audioContext);
            };
            d.addEventListener('click',   handler);
            d.addEventListener('keydown', handler);
        });
    },
    /**
     * verify whether given feature is supported by the
     * audioContext in the current environment
     */
    supports(feature) {
        return !!features[feature];
    }
};
