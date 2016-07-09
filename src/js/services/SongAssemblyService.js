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

const EventUtil = require( "../utils/EventUtil" );

/* private properties */

const ASSEMBLER_VERSION = 1;

/**
 * SongAssembly is used to convert a Song Object into an .XTK representation
 * for file storage. While an .XTK is still a JSON Object, some properties are omitted / renamed
 * to limit filesize
 */
module.exports = {

    /**
     * assembles a song Object from an .XTK file
     *
     * @public
     * @param {string} xtk
     * @return {Object}
     */
    assemble( xtk ) {

        try {

            xtk = ( typeof xtk === "string" ) ? JSON.parse( xtk ) : xtk;

            // first check if XTK had been saved after having been disassembled

            if ( typeof xtk[ ASSEMBLER_VERSION_CODE ] === "number" ) {

                const song = {};

                song.id      = xtk[ SONG_ID ];
                song.version = xtk[ SONG_VERSION_ID ];

                assembleMeta       ( song, xtk[ META_OBJECT ] );
                assembleInstruments( song, xtk[ INSTRUMENTS ]);
                assemblePatterns   ( song, xtk[ PATTERNS ], song.meta.tempo );

                return song;
            }
            else {
                // no assembly present on the XTK, assume legacy Song
                return xtk;
            }
        }
        catch ( e ) {
            return null;
        }
    },

    /**
     * disassembles a song Object into an .XTK file
     *
     * @public
     * @param {Object} song
     * @return {string}
     */
    disassemble( song ) {

        const xtk = {};

        xtk[ ASSEMBLER_VERSION_CODE ] = ASSEMBLER_VERSION;
        xtk[ SONG_ID ]                = song.id;
        xtk[ SONG_VERSION_ID ]        = song.version;

        disassembleMeta       ( xtk, song.meta );
        disassembleInstruments( xtk, song.instruments );
        disassemblePatterns   ( xtk, song.patterns );

        return JSON.stringify( xtk );
    }
};

/* private conversion properties */

const ASSEMBLER_VERSION_CODE = "av",

    SONG_ID         = "si",
    SONG_VERSION_ID = "sv",

    META_OBJECT   = "m",
    META_TITLE    = "t",
    META_AUTHOR   = "a",
    META_CREATED  = "c",
    META_MODIFIED = "dm",
    META_TEMPO    = "tm",

    INSTRUMENTS                 = "ins",
    INSTRUMENT_ID               = "i",
    INSTRUMENT_NAME             = "n",
    INSTRUMENT_VOLUME           = "v",
    INSTRUMENT_DELAY            = "d",
    INSTRUMENT_DELAY_ENABLED    = "e",
    INSTRUMENT_DELAY_CUTOFF     = "c",
    INSTRUMENT_DELAY_FEEDBACK   = "f",
    INSTRUMENT_DELAY_OFFSET     = "o",
    INSTRUMENT_DELAY_TIME       = "t",
    INSTRUMENT_DELAY_TYPE       = "tp",
    INSTRUMENT_FILTER           = "f",
    INSTRUMENT_FILTER_ENABLED   = "e",
    INSTRUMENT_FILTER_DEPTH     = "d",
    INSTRUMENT_FILTER_FREQUENCY = "f",
    INSTRUMENT_FILTER_LFO_TYPE  = "lt",
    INSTRUMENT_FILTER_Q         = "q",
    INSTRUMENT_FILTER_SPEED     = "s",
    INSTRUMENT_FILTER_TYPE      = "ft",

    INSTRUMENT_OSCILLATORS  = "o",
    OSCILLATOR_ENABLED      = "e",
    OSCILLATOR_ADSR         = "a",
    OSCILLATOR_ADSR_ATTACK  = "a",
    OSCILLATOR_ADSR_DECAY   = "d",
    OSCILLATOR_ADSR_SUSTAIN = "s",
    OSCILLATOR_ADSR_RELEASE = "r",
    OSCILLATOR_DETUNE       = "d",
    OSCILLATOR_FINESHIFT    = "f",
    OSCILLATOR_OCTAVE_SHIFT = "o",
    OSCILLATOR_VOLUME       = "v",
    OSCILLATOR_WAVEFORM     = "w",
    OSCILLATOR_TABLE        = "t",

    PATTERNS         = "p",
    PATTERN_STEPS    = "s",
    PATTERN_CHANNELS = "c",

    EVENT_ACTION            = "a",
    EVENT_ID                = "i",
    EVENT_INSTRUMENT        = "ins",
    EVENT_NOTE              = "n",
    EVENT_OCTAVE            = "o",
    EVENT_LENGTH            = "l",
    EVENT_MODULE_AUTOMATION = "ma",
    EVENT_MODULE            = "m",
    EVENT_MODULE_VALUE      = "v",
    EVENT_MODULE_GLIDE      = "g";

/* private methods */

function assembleMeta( song, xtkMeta ) {

    song.meta = {
        title    : xtkMeta[ META_TITLE ],
        author   : xtkMeta[ META_AUTHOR ],
        created  : xtkMeta[ META_CREATED ],
        modified : xtkMeta[ META_MODIFIED ],
        tempo    : xtkMeta[ META_TEMPO ]
    };
}

function disassembleMeta( xtk, meta ) {

    const m = xtk[ META_OBJECT ] = {};

    m[ META_TITLE ]    = meta.title;
    m[ META_AUTHOR ]   = meta.author;
    m[ META_CREATED ]  = meta.created;
    m[ META_MODIFIED ] = meta.modified;
    m[ META_TEMPO ]    = meta.tempo;
}

function assembleInstruments( song, xtkInstruments ) {

    song.instruments = new Array( xtkInstruments.length );
    let xtkDelay, xtkFilter;

    xtkInstruments.forEach( function( xtkInstrument, index ) {

        xtkDelay  = xtkInstrument[ INSTRUMENT_DELAY ];
        xtkFilter = xtkInstrument[ INSTRUMENT_FILTER ];

        song.instruments[ index ] = {
            id         : xtkInstrument[ INSTRUMENT_ID ],
            name       : xtkInstrument[ INSTRUMENT_NAME ],
            volume     : xtkInstrument[ INSTRUMENT_VOLUME ],
            delay      : {
                enabled  : xtkDelay[ INSTRUMENT_DELAY_ENABLED ],
                cutoff   : xtkDelay[ INSTRUMENT_DELAY_CUTOFF ],
                feedback : xtkDelay[ INSTRUMENT_DELAY_FEEDBACK ],
                offset   : xtkDelay[ INSTRUMENT_DELAY_OFFSET ],
                time     : xtkDelay[ INSTRUMENT_DELAY_TIME ],
                type     : xtkDelay[ INSTRUMENT_DELAY_TYPE ]
            },
            filter     : {
                enabled   : xtkFilter[ INSTRUMENT_FILTER_ENABLED ],
                depth     : xtkFilter[ INSTRUMENT_FILTER_DEPTH ],
                frequency : xtkFilter[ INSTRUMENT_FILTER_FREQUENCY ],
                lfoType   : xtkFilter[ INSTRUMENT_FILTER_LFO_TYPE ],
                q         : xtkFilter[ INSTRUMENT_FILTER_Q ],
                speed     : xtkFilter[ INSTRUMENT_FILTER_SPEED ],
                type      : xtkFilter[ INSTRUMENT_FILTER_TYPE ]
            },
            oscillators : new Array( xtkInstrument[ INSTRUMENT_OSCILLATORS].length )
        };

        xtkInstrument[ INSTRUMENT_OSCILLATORS].forEach( function( xtkOscillator, oIndex ) {

            song.instruments[ index ].oscillators[ oIndex ] = {
                enabled: xtkOscillator[ OSCILLATOR_ENABLED ],
                adsr : {
                    attack  : xtkOscillator[ OSCILLATOR_ADSR ][ OSCILLATOR_ADSR_ATTACK ],
                    decay   : xtkOscillator[ OSCILLATOR_ADSR ][ OSCILLATOR_ADSR_DECAY ],
                    sustain : xtkOscillator[ OSCILLATOR_ADSR ][ OSCILLATOR_ADSR_SUSTAIN ],
                    release : xtkOscillator[ OSCILLATOR_ADSR ][ OSCILLATOR_ADSR_RELEASE ]
                },
                detune      : xtkOscillator[ OSCILLATOR_DETUNE ],
                fineShift   : xtkOscillator[ OSCILLATOR_FINESHIFT ],
                octaveShift : xtkOscillator[ OSCILLATOR_OCTAVE_SHIFT ],
                volume      : xtkOscillator[ OSCILLATOR_VOLUME ],
                waveform    : xtkOscillator[ OSCILLATOR_WAVEFORM ],
                table       : xtkOscillator[ OSCILLATOR_TABLE ]
            };
        });
    });
}

function disassembleInstruments( xtk, instruments ) {

    const xtkInstruments = xtk[ INSTRUMENTS ] = new Array( instruments.length );
    let xtkInstrument, delay, filter, xtkDelay, xtkFilter, xtkOscillator, xtkADSR;

    instruments.forEach( function( instrument, index ) {

        xtkInstrument = xtkInstruments[ index ] = {};

        delay  = instrument.delay;
        filter = instrument.filter;

        xtkInstrument[ INSTRUMENT_ID ]          = instrument.id;
        xtkInstrument[ INSTRUMENT_NAME ]        = instrument.name;
        xtkInstrument[ INSTRUMENT_VOLUME ]      = instrument.volume;

        xtkDelay  = xtkInstrument[ INSTRUMENT_DELAY ]  = {};
        xtkFilter = xtkInstrument[ INSTRUMENT_FILTER ] = {};

        xtkDelay[ INSTRUMENT_DELAY_ENABLED  ] = delay.enabled;
        xtkDelay[ INSTRUMENT_DELAY_CUTOFF   ] = delay.cutoff;
        xtkDelay[ INSTRUMENT_DELAY_FEEDBACK ] = delay.feedback;
        xtkDelay[ INSTRUMENT_DELAY_OFFSET   ] = delay.offset;
        xtkDelay[ INSTRUMENT_DELAY_TIME     ] = delay.time;
        xtkDelay[ INSTRUMENT_DELAY_TYPE     ] = delay.type;

        xtkFilter[ INSTRUMENT_FILTER_ENABLED   ] = filter.enabled;
        xtkFilter[ INSTRUMENT_FILTER_DEPTH     ] = filter.depth;
        xtkFilter[ INSTRUMENT_FILTER_FREQUENCY ] = filter.frequency;
        xtkFilter[ INSTRUMENT_FILTER_LFO_TYPE  ] = filter.lfoType;
        xtkFilter[ INSTRUMENT_FILTER_Q         ] = filter.q;
        xtkFilter[ INSTRUMENT_FILTER_SPEED     ] = filter.speed;
        xtkFilter[ INSTRUMENT_FILTER_TYPE      ] = filter.type;

        xtkInstrument[ INSTRUMENT_OSCILLATORS ] = new Array( instrument.oscillators.length );

        instrument.oscillators.forEach( function( oscillator, oIndex ) {

            xtkOscillator = xtkInstrument[ INSTRUMENT_OSCILLATORS ][ oIndex ] = {};

            xtkOscillator[ OSCILLATOR_ENABLED ]        = oscillator.enabled;
            xtkADSR = xtkOscillator[ OSCILLATOR_ADSR ] = {};

            xtkADSR[ OSCILLATOR_ADSR_ATTACK  ] = oscillator.adsr.attack;
            xtkADSR[ OSCILLATOR_ADSR_DECAY   ] = oscillator.adsr.decay;
            xtkADSR[ OSCILLATOR_ADSR_SUSTAIN ] = oscillator.adsr.sustain;
            xtkADSR[ OSCILLATOR_ADSR_RELEASE ] = oscillator.adsr.release;

            xtkOscillator[ OSCILLATOR_DETUNE       ] = oscillator.detune;
            xtkOscillator[ OSCILLATOR_FINESHIFT    ] = oscillator.fineShift;
            xtkOscillator[ OSCILLATOR_OCTAVE_SHIFT ] = oscillator.octaveShift;
            xtkOscillator[ OSCILLATOR_VOLUME       ] = oscillator.volume;
            xtkOscillator[ OSCILLATOR_WAVEFORM     ] = oscillator.waveform;
            xtkOscillator[ OSCILLATOR_TABLE        ] = oscillator.table;
        });
    });
}

function assemblePatterns( song, xtkPatterns, tempo ) {

    song.patterns = new Array( xtkPatterns.length );
    let pattern, channel, event, xtkAutomation;

    xtkPatterns.forEach( function( xtkPattern, pIndex ) {

        pattern = song.patterns[ pIndex ] = {
            steps: xtkPattern[ PATTERN_STEPS ],
            channels: xtkPattern[ PATTERN_CHANNELS ]
        };

        xtkPattern[ PATTERN_CHANNELS ].forEach( function( xtkChannel, cIndex ) {

            channel = pattern.channels[ cIndex ] = new Array( xtkChannel.length );

            xtkChannel.forEach( function( xtkEvent, eIndex ) {

                if ( xtkEvent ) {

                    event = {
                        action:     xtkEvent[ EVENT_ACTION ],
                        id :        xtkEvent[ EVENT_ID ],
                        instrument: xtkEvent[ EVENT_INSTRUMENT ],
                        note:       xtkEvent[ EVENT_NOTE ],
                        octave:     xtkEvent[ EVENT_OCTAVE ],
                        recording:  false,
                        seq: {
                            playing: false,
                            mpLength: 0
                        }
                    };

                    EventUtil.setPosition( event, pattern, pIndex, eIndex, tempo, xtkEvent[ EVENT_LENGTH ]);

                    if ( xtkAutomation = xtkEvent[ EVENT_MODULE_AUTOMATION ]) {

                        event.mp = {
                            module: xtkAutomation[ EVENT_MODULE ],
                            value:  xtkAutomation[ EVENT_MODULE_VALUE ],
                            glide:  xtkAutomation[ EVENT_MODULE_GLIDE ]
                        };
                    }
                }
                else {
                    event = 0;
                }
                channel[ eIndex ] = event;
            });
        })
    });
}

function disassemblePatterns( xtk, patterns ) {

    const xtkPatterns = xtk[ PATTERNS ] = new Array( patterns.length );
    let xtkPattern, xtkChannel, xtkEvent, xtkAutomation;

    patterns.forEach( function( pattern, pIndex ) {

        xtkPattern = xtkPatterns[ pIndex ] = {};

        xtkPattern[ PATTERN_STEPS ]    = pattern.steps;
        xtkPattern[ PATTERN_CHANNELS ] = new Array( pattern.channels.length );

        pattern.channels.forEach( function( channel, cIndex ) {

            xtkChannel = xtkPattern[ PATTERN_CHANNELS ][ cIndex ] = new Array( channel.length );

            channel.forEach( function( event, eIndex ) {

                if ( event ) {

                    xtkEvent = {};

                    xtkEvent[ EVENT_ID ]         = event.id;
                    xtkEvent[ EVENT_ACTION ]     = event.action;
                    xtkEvent[ EVENT_INSTRUMENT ] = event.instrument;
                    xtkEvent[ EVENT_NOTE ]       = event.note;
                    xtkEvent[ EVENT_OCTAVE ]     = event.octave;
                    xtkEvent[ EVENT_LENGTH ]     = event.seq.length;

                    if ( event.mp ) {
                        xtkAutomation = xtkEvent[ EVENT_MODULE_AUTOMATION ] = {};

                        xtkAutomation[ EVENT_MODULE ]       = event.mp.module;
                        xtkAutomation[ EVENT_MODULE_VALUE ] = event.mp.value;
                        xtkAutomation[ EVENT_MODULE_GLIDE ] = event.mp.glide;
                    }
                }
                else {
                    xtkEvent = 0; // "0" is 3 bytes smaller than "null" ;)
                }
                xtkChannel[ eIndex ] = xtkEvent;
            });
        });
    });
}
