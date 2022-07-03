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

/**
 * keys used when serializing Song factory
 * Objects into their JSON representation
 */
export const PATTERNS = "p";
export const PATTERN_STEPS    = "s";
export const PATTERN_CHANNELS = "c";

// as notes and automation instruction might be repeated
// throughout a song we create pools to prevent redefining them

export const NOTE_POOLS       = "np";
export const AUTOMATION_POOLS = "ap";

export const EVENT_ACTION            = "a";
// export const EVENT_ID                = "i"; // ids are a runtime requirement; will be regenerated on load just fine
export const EVENT_INSTRUMENT        = "ins";
export const EVENT_NOTE              = "n";
export const EVENT_OCTAVE            = "o";
export const EVENT_LENGTH            = "l";
export const EVENT_MODULE_AUTOMATION = "ma";
export const EVENT_MODULE            = "m";
export const EVENT_MODULE_VALUE      = "v";
export const EVENT_MODULE_GLIDE      = "g";

/**
 * serializes a list of patterns into an .XTK file
 *
 * @param {Object} xtk destination XTK file to serialize into
 * @param {Array<EffluxPattern>} patterns to serialize
 */
export const serialize = ( xtk, patterns ) => {
    const xtkPatterns       = xtk[ PATTERNS ] = new Array( patterns.length );
    const xtkNotePool       = xtk[ NOTE_POOLS ]   = [];
    const xtkAutomationPool = xtk[ AUTOMATION_POOLS ] = [];

    let xtkPattern, xtkChannel, xtkEvent, xtkAutomation, poolRef;

    patterns.forEach(( pattern, pIndex ) => {

        xtkPattern = xtkPatterns[ pIndex ] = {};

        xtkPattern[ PATTERN_STEPS ]    = pattern.steps;
        xtkPattern[ PATTERN_CHANNELS ] = new Array( pattern.channels.length );

        pattern.channels.forEach(( channel, cIndex ) => {

            xtkChannel = xtkPattern[ PATTERN_CHANNELS ][ cIndex ] = new Array( channel.length );

            channel.forEach(( event, eIndex ) => {

                if ( event ) {

                    xtkEvent = {};

                    xtkEvent[ EVENT_ACTION ]     = event.action;
                    xtkEvent[ EVENT_INSTRUMENT ] = event.instrument;
                    xtkEvent[ EVENT_NOTE ]       = event.note;
                    xtkEvent[ EVENT_OCTAVE ]     = event.octave;
                    xtkEvent[ EVENT_LENGTH ]     = event.seq.length;

                    // pool the event or reference the pool if its definition already existed
                    poolRef = poolObject(xtkNotePool, xtkEvent);

                    if ( event.mp ) {
                        xtkAutomation = {};

                        xtkAutomation[ EVENT_MODULE ]       = event.mp.module;
                        xtkAutomation[ EVENT_MODULE_VALUE ] = event.mp.value;
                        xtkAutomation[ EVENT_MODULE_GLIDE ] = event.mp.glide;

                        // pool the automation or reference the pool if its definition already existed
                        poolRef += `|${poolObject( xtkAutomationPool, xtkAutomation )}`;
                    }
                    xtkEvent = poolRef;
                }
                else {
                    xtkEvent = 0; // "0" is 3 bytes smaller than "null" ;)
                }
                xtkChannel[ eIndex ] = xtkEvent;
            });
        });
    });
};

/* internal methods */

function poolObject( pool, object ) {
    const hash = JSON.stringify( object );
    let idx = pool.indexOf( hash );
    if ( idx === -1 ) {
        idx = pool.push( hash ) - 1;
    }
    return idx.toString();
}
