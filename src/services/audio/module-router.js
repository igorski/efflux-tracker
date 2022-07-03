/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
import { connectAnalysers } from "@/services/audio-service";

let moduleOutput, panner, eq, overdrive, filter, delay, analyser;

/**
 * apply the routing for the given instrument modules
 * (e.g. toggling devices on/off and connecting them
 * to the corresponding devices)
 *
 * @param {INSTRUMENT_MODULES} modules
 * @param {AudioParam} output
 */
export const applyRouting = ( modules, output ) => {
    const routes   = [];

    moduleOutput = modules.output, // is voice channel output (pre-FX)
    panner       = modules.panner, // can be null when unsupported
    eq           = modules.eq,
    overdrive    = modules.overdrive.overdrive,
    filter       = modules.filter.filter,
    delay        = modules.delay.delay;
    analyser     = modules.analyser;

    const connectAnalyser = connectAnalysers();

    analyser.disconnect();
    moduleOutput.disconnect();
    overdrive.disconnect();
    eq.output.disconnect();
    filter.disconnect();
    delay.output.disconnect();

    let lastOutput = moduleOutput;

    if ( panner ) {
        panner.disconnect();
        lastOutput.connect( panner );
        lastOutput = panner; // all other modules are applied post-pan
    }

    if ( eq.eqEnabled ) {
        lastOutput.connect( eq.lowBand );
        lastOutput.connect( eq.midBand );
        lastOutput.connect( eq.highBand );
        lastOutput = eq.output;
    }

    if ( modules.overdrive.overdriveEnabled ) {
        routes.push( overdrive );
    }

    if ( modules.filter.filterEnabled ) {
        routes.push( filter );
    }

    if ( modules.delay.delayEnabled ) {
        routes.push( delay );
    }
    routes.push( connectAnalyser ? analyser : output );

    let input;
    routes.forEach( mod => {

        // some signatures are different here
        // Delay and Overdrive have "input" and "output" GainNodes
        // for any other type of connection (e.g. filter) mod is the node

        input = ( mod.input instanceof GainNode ) ? mod.input : mod;
        lastOutput.connect( input );
        lastOutput = ( mod.output instanceof GainNode ) ? mod.output : mod;
    });

    if ( connectAnalyser ) {
        analyser.connect( output );
    }
};
