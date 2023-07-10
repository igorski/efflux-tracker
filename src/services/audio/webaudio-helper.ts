/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
// @ts-expect-error deprecated methods queried on window
const isStandards = ( !!( "AudioContext" in window ) || ( "webkitAudioContext" in window && typeof (new window.webkitAudioContext()).createGain === "function"));
const d = window.document;

const features = {
    panning: false
};
let timerNode: GainNode | undefined;

// Pre-calculate the WaveShaper curves.
const pulseCurve: Float32Array = new Float32Array( 256 );
for ( let i = 0; i < 128; ++i ) {
    pulseCurve[ i ] = -1;
    pulseCurve[ i + 128 ] = 1;
}
const constantOneCurve: Float32Array = new Float32Array(2);
constantOneCurve[ 0 ] = 1;
constantOneCurve[ 1 ] = 1;

/**
 * create a WaveTable from given graphPoints Array (a list of
 * y-coordinate points drawn in the UI) and apply it onto the given
 * OscillatorNode oscillator
 */
export const createWaveTableFromGraph = ( audioContext: BaseAudioContext, graphPoints: number[] ): PeriodicWave => {
    const dft = new DFT( graphPoints.length, audioContext.sampleRate );
    dft.forward( graphPoints );

    return audioContext.createPeriodicWave( dft.real, dft.imag );
};

/**
 * use the accuracy of the WebAudio clock to execute a callback
 * with strict timing.
 *
 * @param {BaseAudioContext} audioContext
 * @param {number} time when the callback should be fired (relative to AudioContext currentTime)
 * @param {!Function} callback function to execute
 * @return {OscillatorNode}
 */
export const createTimer = ( audioContext: BaseAudioContext, time: number, callback: () => void ): OscillatorNode => {
    // this magic works by using a silent oscillator to play for given time
    const timer   = audioContext.createOscillator();
    timer.onended = callback;

    if ( timerNode === undefined ) {
        timerNode = createGainNode( audioContext );
        timerNode.gain.value = 0;
        timerNode.connect( audioContext.destination );
    }
    // timer will automatically disconnect() once stopped
    // and garbage collected
    timer.connect( timerNode );

    startOscillation( timer, audioContext.currentTime );
    stopOscillation( timer, time );

    return timer;
};

/**
 * sound a sine wave at given frequency (can be used for testing)
 *
 * @param {BaseAudioContext} audioContext
 * @param {number} frequencyInHertz
 * @param {number=} startTimeInSeconds optional, defaults to current time
 * @param {number=} durationInSeconds optional, defaults to 1 second
 * @return {OscillatorNode} created Oscillator
 */
export const beep = ( audioContext: BaseAudioContext, frequencyInHertz: number,
    startTimeInSeconds?: number, durationInSeconds?: number ): OscillatorNode => {

    const oscillator = audioContext.createOscillator();
    oscillator.connect( audioContext.destination );

    oscillator.frequency.value = frequencyInHertz;

    if ( typeof startTimeInSeconds !== "number" || startTimeInSeconds === 0 ) {
        startTimeInSeconds = audioContext.currentTime;
    }

    if ( typeof durationInSeconds !== "number" ) {
        durationInSeconds = 1;
    }

    // oscillator will start, stop and can be garbage collected after going out of scope

    oscillator.onended = () => oscillator.disconnect();

    startOscillation( oscillator, startTimeInSeconds );
    stopOscillation ( oscillator, startTimeInSeconds + durationInSeconds );

    return oscillator;
};

export const startOscillation = ( node: AudioScheduledSourceNode, startTime: number ): void => {
    if ( isStandards ) {
        node.start( startTime );
    } else {
        // @ts-expect-error deprecated method
        node.noteOn( startTime );
    }
};

export const stopOscillation = ( node: AudioScheduledSourceNode, stopTime: number ): void => {
    try {
        if ( isStandards ) {
            node.stop( stopTime );
        } else {
            // @ts-expect-error deprecated method
            node.noteOff( stopTime );
        }
    } catch ( e ) {
        // likely Safari DOM Exception 11 if oscillator was previously stopped
    }
};

export const createGainNode = ( context: BaseAudioContext ): GainNode => {
    if ( isStandards ) {
        return context.createGain();
    }
    // @ts-expect-error deprecated method
    return context.createGainNode();
};

/**
 * At the moment of writing, StereoPannerNode is not supported
 * in Safari, so this can return null!
 */
export const createStereoPanner = ( context: BaseAudioContext ): StereoPannerNode | null  => {
    // last minute checks on feature support
    if ( typeof context.createStereoPanner !== "function" ) {
        return null;
    }
    return context.createStereoPanner();
};

/**
 * Force given value onto given param, cancelling all scheduled values (e.g. hard "reset")
 */
export const setValue = ( param: AudioParam, value: number, audioContext: BaseAudioContext ): void => {
    param.cancelScheduledValues( audioContext.currentTime );
    param.setValueAtTime( value, audioContext.currentTime );
};

type PWMNode = OscillatorNode & { width: AudioParam };

/**
 * Create a Pulse Width Modulator
 * based on https://github.com/pendragon-andyh/WebAudio-PulseOscillator
 */
export const createPWM = ( audioContext: BaseAudioContext, startTime: number, endTime: number,
    destination?: AudioNode ): OscillatorNode => {

    if ( !destination ) {
        destination = audioContext.destination;
    }

    // note we are extending the OscillatorNode prototype with a "width" property
    const pulseOsc: PWMNode = audioContext.createOscillator() as never as PWMNode;
    pulseOsc.type  = "sawtooth";

    // Shape the output into a pulse wave.
    const pulseShaper = audioContext.createWaveShaper();
    pulseShaper.curve = pulseCurve;
    pulseOsc.connect( pulseShaper );

    // Use a GainNode as our new "width" audio parameter.
    const widthGain = createGainNode( audioContext );
    widthGain.gain.value = 0; //Default width.
    pulseOsc.width = widthGain.gain; // Add parameter to oscillator node.
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
    // new node's output actually comes from the pulseShaper.
    // @ts-expect-error proxied override
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
    lfo.connect( lfoDepth );
    lfoDepth.connect( pulseOsc.width );
    lfo.start( startTime );
    lfo.stop( endTime );

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
 * @param {Function=} optCallback optional callback to execute on initialization
 * @return {Promise<AudioContext>} with generated AudioContext
 */
export const init = ( optCallback?: () => void ): Promise<AudioContext> => {
    return new Promise(( resolve, reject ) => {
        let audioContext: AudioContext;
        const handler = ( e: Event ): void => {
            if ( e.type === "keydown" && ( e as KeyboardEvent ).keyCode === 27 ) {
                return; // hitting escape will not actually unlock the AudioContext
            }
            d.removeEventListener( "click",   handler, false );
            d.removeEventListener( "keydown", handler, false );
            window.removeEventListener( "drop", handler, false );

            if ( typeof window.AudioContext !== "undefined" ) {
                audioContext = new window.AudioContext();
            }
            // @ts-expect-error webkitAudioContext not in official spec
            else if ( typeof window.webkitAudioContext !== "undefined" ) {
                // @ts-expect-error deprecated constructor
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
            optCallback?.();
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
export const createOfflineAudioContext = ( durationInSeconds: number, sampleRateInHz = 44100, channels = 2 ): OfflineAudioContext => {
    return new OfflineAudioContext( channels, Math.ceil( sampleRateInHz * durationInSeconds ), sampleRateInHz );
};

/**
 * verify whether given feature is supported by the
 * audioContext in the current environment
 */
// @ts-expect-error need to make enum for Features
export const supports = ( feature: string ) => !!features[ feature ];

/**
 * The below solve an issue where Safari creates "WebKitOscillatorNode" and
 * "WebkitAudioBufferSourceNode" where instanceof OscillatorNode and
 * instanceof AudioBufferSourceNode fail !! We check for their unique properties instead
 * as we cannot do instanceof checks on the "WebKit"...-prefixed alternatives.
 */

// @ts-expect-error 'frequency' should not exist on AudioBufferSourceNode
export const isOscillatorNode = ( node: OscillatorNode | AudioBufferSourceNode ) => !!node.frequency;

// @ts-expect-error 'buffer' should not exist on OscilatorNode
export const isAudioBufferSourceNode = ( node: OscillatorNode | AudioBufferSourceNode ) => !!node.buffer;
