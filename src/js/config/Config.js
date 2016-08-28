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
"use strict";

module.exports =
{
    LOCAL_STORAGE_SONGS         : "effluxData",
    LOCAL_STORAGE_INSTRUMENTS   : "effluxInstruments",
    INSTRUMENT_AMOUNT           : 8,
    WAVE_TABLE_SIZE             : 512,
    MAX_PATTERN_AMOUNT          : 128,
    MAX_OCTAVE                  : 8,
    SONG_FILE_EXTENSION         : ".xtk",
    INSTRUMENT_FILE_EXTENSION   : ".xit",

    DEFAULT_FILTER_FREQ         : 880,
    DEFAULT_FILTER_Q            : 5,
    MAX_FILTER_FREQ             : 24000,
    MAX_FILTER_Q                : 40,

    DEFAULT_FILTER_LFO_SPEED    : .5,
    DEFAULT_FILTER_LFO_DEPTH    : 50,
    MAX_FILTER_LFO_SPEED        : 25,
    MAX_FILTER_LFO_DEPTH        : 100,

    DEFAULT_DELAY_MIX           : .65,
    DEFAULT_DELAY_FEEDBACK      : 0.01,
    DEFAULT_DELAY_TIME          : 0.33,
    DEFAULT_DELAY_CUT_OFF       : 1500,
    MAX_DELAY_TIME              : 2,
    MAX_DELAY_FEEDBACK          : 1,
    MAX_DELAY_CUTOFF            : 22050,
    MAX_DELAY_OFFSET            : 1,

    /**
     * return the path that Efflux is running in, this can
     * differ dependent on the production environment
     *
     * @public
     * @return {string}
     */
    getBasePath()
    {
        return ( typeof window.effluxPath === "string" ) ? window.effluxPath : window.location.origin + window.location.pathname;
    },

    /**
     * whether the application is running in local development mode
     *
     * @public
     * @return {boolean}
     */
    isDevMode()
    {
        // simple check whether we're running through the connect plugin
        return ( window.location.hostname === "localhost" || window.location.port === "3000" );
    }
};
