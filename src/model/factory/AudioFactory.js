/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2018 - https://www.igorski.nl
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

/* private properties */

// we assume that the audioContext works according to the newest standards
// if its is available as window.AudioContext
// UPDATE: newer Safaris still use webkitAudioContext but have updated the API
// method names according to spec
const isStandards = ( !!( "AudioContext" in window ) || ( "webkitAudioContext" in window && typeof (new window.webkitAudioContext()).createGain === "function"));

/**
 * AudioFactory provides wrapper methods to overcome
 * differences in AudioContext implementations across browsers
 */
const AudioFactory =
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
        catch ( e ) {
            // likely Safari DOM Exception 11 if oscillator was previously stopped
        }
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
     * Create a Pulse Width Modulator
     * based on https://github.com/pendragon-andyh/WebAudio-PulseOscillator
     *
     * @public
     * @param {AudioContext} audioContext
     * @param {number} startTime
     * @param {number} endTime
     * @param {AudioDestinationNode=} destination
     * @return {OscillatorNode}
     */
   createPWM( audioContext, startTime, endTime, destination = audioContext.destination ) {

        const pulseOsc = audioContext.createOscillator();
        pulseOsc.type  = "sawtooth";

        // Shape the output into a pulse wave.
        const pulseShaper = audioContext.createWaveShaper();
        pulseShaper.curve = pulseCurve;
        pulseOsc.connect( pulseShaper );

        //Use a GainNode as our new "width" audio parameter.
        const widthGain = AudioFactory.createGainNode( audioContext );
        widthGain.gain.value = 0; //Default width.
        pulseOsc.width = widthGain.gain; //Add parameter to oscillator node.
        widthGain.connect( pulseShaper );

        //Pass a constant value of 1 into the widthGain – so the "width" setting
        //is duplicated to its output.
        const constantOneShaper = audioContext.createWaveShaper();
        constantOneShaper.curve = constantOneCurve;
        pulseOsc.connect( constantOneShaper );
        constantOneShaper.connect( widthGain );

        // Override the oscillator's "connect" and "disconnect" method so that the
        // new node's output actually comes from the pulseShaper.
        pulseOsc.connect = function() {
            pulseShaper.connect.apply( pulseShaper, arguments );
        };
        pulseOsc.disconnect = function() {
            pulseShaper.disconnect.apply( pulseShaper, arguments );
        };

        // The pulse-width will start at 0.4 and finish at 0.1.
        pulseOsc.width.value = 0.4; //The initial pulse-width.
        pulseOsc.width.exponentialRampToValueAtTime( 0.1, endTime );

        // Add a low frequency oscillator to modulate the pulse-width.
        const lfo = audioContext.createOscillator();
        lfo.type = "triangle";
        lfo.frequency.value = 10;

        const lfoDepth = AudioFactory.createGainNode( audioContext );
        lfoDepth.gain.value = 0.1;
        lfoDepth.gain.exponentialRampToValueAtTime( 0.05, startTime + 0.5 );
        lfoDepth.gain.exponentialRampToValueAtTime( 0.15, endTime );
        lfo.connect(lfoDepth);
        lfoDepth.connect(pulseOsc.width);
        lfo.start(startTime);
        lfo.stop(endTime);

        const filter = audioContext.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 16000;
        filter.frequency.exponentialRampToValueAtTime( 440, endTime );
        pulseOsc.connect( filter );
        filter.connect( destination );

        return pulseOsc;
   }
};

//Pre-calculate the WaveShaper curves so that we can reuse them.
const pulseCurve = new Float32Array( 256 );
for ( let i = 0; i < 128; ++i ) {
    pulseCurve[ i ]       = -1;
    pulseCurve[ i + 128 ] = 1;
}
const constantOneCurve = new Float32Array( 2 );
constantOneCurve[ 0 ] = 1;
constantOneCurve[ 1 ] = 1;

export default AudioFactory;
