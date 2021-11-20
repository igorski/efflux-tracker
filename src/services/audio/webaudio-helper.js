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
import { DFT } from "./dft";

 // we assume that the audioContext works according to the newest standards
 // if its is available as window.AudioContext
 // UPDATE: newer Safaris still use webkitAudioContext but have updated the API
 // method names according to spec
const isStandards = ( !!( "AudioContext" in window ) || ( "webkitAudioContext" in window && typeof (new window.webkitAudioContext()).createGain === "function"));
const d = window.document;
const features = {
    panning: false
};
let timerNode;

// Pre-calculate the WaveShaper curves.
const pulseCurve = new Float32Array(256);
for (let i = 0; i < 128; ++i) {
    pulseCurve[i]       = -1;
    pulseCurve[i + 128] = 1;
}
const constantOneCurve = new Float32Array(2);
constantOneCurve[0] = 1;
constantOneCurve[1] = 1;

/**
 * create a WaveTable from given graphPoints Array (a list of
 * y-coordinate points drawn in the UI) and apply it onto the given
 * OscillatorNode oscillator
 *
 * @param {AudioContext} audioContext
 * @param {Array<number>} graphPoints
 * @return {PeriodicWave}
 */
export const createWaveTableFromGraph = ( audioContext, graphPoints ) => {
    const dft = new DFT(graphPoints.length);
    dft.forward(graphPoints);

    return audioContext.createPeriodicWave(dft.real, dft.imag);
};

/**
 * use the accuracy of the WebAudio clock to execute a callback
 * with strict timing.
 *
 * @param {AudioContext} audioContext
 * @param {number} time when the callback should be fired (relative to AudioContext currentTime)
 * @param {!Function} callback function to execute
 * @return {OscillatorNode}
 */
export const createTimer = ( audioContext, time, callback ) => {
    // this magic works by using a silent oscillator to play for given time
    const timer   = audioContext.createOscillator();
    timer.onended = callback;

    if (!timerNode) {
        timerNode = createGainNode(audioContext);
        timerNode.gain.value = 0;
        timerNode.connect(audioContext.destination);
    }
    // timer will automatically disconnect() once stopped
    // and garbage collected
    timer.connect(timerNode);

    startOscillation(timer, audioContext.currentTime);
    stopOscillation (timer, time);

    return timer;
};

/**
 * sound a sine wave at given frequency (can be used for testing)
 *
 * @param {AudioContext} audioContext
 * @param {number} frequencyInHertz
 * @param {number=} startTimeInSeconds optional, defaults to current time
 * @param {number=} durationInSeconds optional, defaults to 1 second
 *
 * @return {OscillatorNode} created Oscillator
 */
export const beep = ( audioContext, frequencyInHertz, startTimeInSeconds, durationInSeconds ) => {
    const oscillator = audioContext.createOscillator();
    oscillator.connect( audioContext.destination );

    oscillator.frequency.value = frequencyInHertz;

    if ( typeof startTimeInSeconds !== "number" || startTimeInSeconds === 0 )
        startTimeInSeconds = audioContext.currentTime;

    if ( typeof durationInSeconds !== "number" )
        durationInSeconds = 1;

    // oscillator will start, stop and can be garbage collected after going out of scope

    oscillator.onended = () => oscillator.disconnect();

    startOscillation( oscillator, startTimeInSeconds );
    stopOscillation ( oscillator, startTimeInSeconds + durationInSeconds );

    return oscillator;
};

/**
 * @param {OscillatorNode} oscillator
 * @param {number} startTime AudioContext time at which to start
 */
export const startOscillation = (oscillator, startTime) => {
    if (isStandards)
        oscillator.start(startTime);
    else
        oscillator.noteOn(startTime);
};

/**
 * @param {OscillatorNode} oscillator
 * @param {number} stopTime AudioContext time at which to stop
 */
export const stopOscillation = (oscillator, stopTime) => {
    try {
        if (isStandards)
            oscillator.stop(stopTime);
        else
            oscillator.noteOff(stopTime);
    } catch ( e ) {
        // likely Safari DOM Exception 11 if oscillator was previously stopped
    }
};

/**
 * @param {webkitAudioContext|AudioContext} aContext
 * @return {AudioGainNode}
 */
export const createGainNode = aContext => {
    if ( isStandards )
        return aContext.createGain();

    return aContext.createGainNode();
};

/**
 * At the moment of writing, StereoPannerNode is not supported
 * in Safari, so this can return null!
 *
 * @param {webkitAudioContext|AudioContext} audioContext
 * @return {StereoPannerNode|null}
 */
export const createStereoPanner = audioContext => {
    // last minute checks on feature support
    if ( typeof audioContext.createStereoPanner !== "function" ) {
        return null;
    }
    return audioContext.createStereoPanner();
};

/**
 * Force given value onto given param, cancelling all scheduled values (e.g. hard "reset")
 * @param {AudioParam} param
 * @param {number} value
 * @param {webkitAudioContext|AudioContext} audioContext
 */
export const setValue = (param, value, audioContext) => {
    param.cancelScheduledValues(audioContext.currentTime);
    param.setValueAtTime(value, audioContext.currentTime);
};

/**
 * Create a Pulse Width Modulator
 * based on https://github.com/pendragon-andyh/WebAudio-PulseOscillator
 *
 * @param {AudioContext} audioContext
 * @param {number} startTime
 * @param {number} endTime
 * @param {AudioDestinationNode=} destination
 * @return {OscillatorNode}
 */
export const createPWM = ( audioContext, startTime, endTime, destination = audioContext.destination ) => {
    const pulseOsc = audioContext.createOscillator();
    pulseOsc.type  = "sawtooth";

    // Shape the output into a pulse wave.
    const pulseShaper = audioContext.createWaveShaper();
    pulseShaper.curve = pulseCurve;
    pulseOsc.connect( pulseShaper );

    // Use a GainNode as our new "width" audio parameter.
    const widthGain = createGainNode( audioContext );
    widthGain.gain.value = 0; //Default width.
    pulseOsc.width = widthGain.gain; //Add parameter to oscillator node.
    widthGain.connect( pulseShaper );

    // Pass a constant value of 1 into the widthGain – so the "width" setting
    // is duplicated to its output.
    const constantOneShaper = audioContext.createWaveShaper();
    constantOneShaper.curve = constantOneCurve;
    pulseOsc.connect( constantOneShaper );
    constantOneShaper.connect( widthGain );

    // Add a low frequency oscillator to modulate the pulse-width.
    const lfo = audioContext.createOscillator();
    const lfoDepth = createGainNode( audioContext );
    const filter = audioContext.createBiquadFilter();

    lfo.type = "triangle";
    lfo.frequency.value = 10;

    // Override the oscillator"s "connect" and "disconnect" method so that the
    // new node"s output actually comes from the pulseShaper.
    pulseOsc.connect = function() {
        pulseShaper.connect.apply( pulseShaper, arguments );
    };
    pulseOsc.disconnect = function() {
        // note all OscillatorNodes will automatically disconnect after stop()
        pulseShaper.disconnect.apply( pulseShaper, arguments );
        widthGain.disconnect();
        constantOneShaper.disconnect();
        lfoDepth.disconnect();
        filter.disconnect();
    };

    // The pulse-width will start at 0.4 and finish at 0.1.
    pulseOsc.width.value = 0.4; //The initial pulse-width.
    pulseOsc.width.exponentialRampToValueAtTime( 0.1, endTime );

    lfoDepth.gain.value = 0.1;
    lfoDepth.gain.exponentialRampToValueAtTime( 0.05, startTime + 0.5 );
    lfoDepth.gain.exponentialRampToValueAtTime( 0.15, endTime );
    lfo.connect(lfoDepth);
    lfoDepth.connect(pulseOsc.width);
    lfo.start(startTime);
    lfo.stop(endTime);

    filter.type = "lowpass";
    filter.frequency.value = 16000;
    filter.frequency.exponentialRampToValueAtTime( 440, endTime );
    pulseOsc.connect( filter );
    filter.connect( destination );

    return pulseOsc;
};

/**
 * On mobile (and an increasing number of desktop environments) all audio is muted
 * unless the engine has been initialized directly after a user interaction.
 * This method will lazily create the AudioContext on the first click/touch/
 * keyboard interaction.
 *
 * @return {Promise} with generated AudioContext
 */
export const init = () => {
    return new Promise(( resolve, reject ) => {
        let audioContext;
        const handler = () => {
            d.removeEventListener( "click",   handler, false );
            d.removeEventListener( "keydown", handler, false );
            window.removeEventListener( "drop", handler, false );

            if ( typeof window.AudioContext !== "undefined" ) {
                audioContext = new window.AudioContext();
            }
            else if ( typeof window.webkitAudioContext !== "undefined" ) {
                audioContext = new window.webkitAudioContext();
            }
            else {
                reject( new Error( "WebAudio API not supported" ));
                return;
            }

            // not all environments support the same features
            // within the AudioContext, check them here

            features.panning = typeof audioContext.createStereoPanner === "function";

            resolve( audioContext );
        };
        d.addEventListener( "click",   handler );
        d.addEventListener( "keydown", handler );
        window.addEventListener( "drop", handler );
    });
};

/**
 * Create an OfflineAudioContext of given duration in seconds in length for
 * given sample rate and channel amount.
 */
export const createOfflineAudioContext = ( durationInSeconds, sampleRateInHz = 44100, channels = 2 ) => {
    return new OfflineAudioContext( channels, Math.ceil( sampleRateInHz * durationInSeconds ), sampleRateInHz );
};

/**
 * verify whether given feature is supported by the
 * audioContext in the current environment
 */
export const supports = feature => !!features[feature];

/**
 * The below solve an issue where Safari creates "WebKitOscillatorNode" and
 * "WebkitAudioBufferSourceNode" where instanceof OscillatorNode and
 * instanceof AudioBufferSourceNode fail !! We check for their unique properties instead
 * as we cannot do instanceof checks on the "WebKit"...-prefixed alternatives.
 */
export const isOscillatorNode        = node => !!node.frequency // node instanceof OscillatorNode
export const isAudioBufferSourceNode = node => !!node.buffer;   // node instanceof AudioBufferSourceNode
