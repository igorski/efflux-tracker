/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2020 - https://www.igorski.nl
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
import EventUtil         from '../utils/event-util';
import SongValidator     from '../model/validators/song-validator';
import InstrumentFactory from '../model/factory/instrument-factory';
import WaveTables        from './audio/wave-tables';

/* private properties */

const ASSEMBLER_VERSION = 5;

/**
 * assembles a song Object from an .XTK file
 *
 * @param {Object|string} xtk
 * @return {Object}
 */
export const assemble = xtk => {
    try {
        xtk = ( typeof xtk === 'string' ) ? JSON.parse( xtk ) : xtk;

        const xtkVersion = xtk[ ASSEMBLER_VERSION_CODE ]; // is ASSEMBLER_VERSION used during save

        // first check if XTK had been saved after having been disassembled

        if ( typeof xtkVersion === 'number' ) {

            const song = {};

            song.id      = xtk[ SONG_ID ];
            song.version = xtk[ SONG_VERSION_ID ];

            assembleMeta       ( song, xtkVersion, xtk[ META_OBJECT ] );
            assembleInstruments( song, xtkVersion, xtk[ INSTRUMENTS ]);
            assemblePatterns   ( song, xtkVersion, xtk, song.meta.tempo );

            // perform transformation on legacy songs
            SongValidator.transformLegacy( song );

            return song;
        }
        else {
            // no assembly present on the XTK, assume legacy Song (is Object)
            return xtk;
        }
    }
    catch ( e ) {
        return null;
    }
};

/**
 * SongAssembly is used to convert a Song Object into an .XTK representation
 * for file storage. While an .XTK is still a JSON Object, some properties are omitted / renamed
 * to limit filesize
 */
export default
{
    assemble,
    /**
     * disassembles a song Object into an .XTK file
     *
     * @param {SONG} song
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

/* internal methods */

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
      INSTRUMENT_PRESET_NAME      = "pn",
      INSTRUMENT_VOLUME           = "v",
      INSTRUMENT_PANNING          = "ip",
      INSTRUMENT_MUTED            = "im",
      INSTRUMENT_SOLOD            = "is",
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
      INSTRUMENT_EQ               = "eq",
      INSTRUMENT_EQ_ENABLED       = "e",
      INSTRUMENT_EQ_LOW           = "l",
      INSTRUMENT_EQ_MID           = "m",
      INSTRUMENT_EQ_HIGH          = "h",
      INSTRUMENT_OD               = "od",
      INSTRUMENT_OD_ENABLED       = "e",
      INSTRUMENT_OD_PREBAND       = "pb",
      INSTRUMENT_OD_POSTCUT       = "pc",
      INSTRUMENT_OD_COLOR         = "c",
      INSTRUMENT_OD_DRIVE         = "d",
      WAVE_TABLES                 = "wt",

      INSTRUMENT_OSCILLATORS  = "o",
      OSCILLATOR_ENABLED      = "e",
      OSCILLATOR_ADSR         = "a",
      OSCILLATOR_PITCH        = "pe",
      OSCILLATOR_PITCH_RANGE  = "pr",
      // ADSR used for both amplitude and pitch envelopes
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

      // as notes and automation instruction might be repeated
      // throughout a song we create pools to prevent redefining them

      NOTE_POOLS       = "np",
      AUTOMATION_POOLS = "ap",

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

function assembleMeta( song, savedXtkVersion, xtkMeta ) {

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

function assembleInstruments( song, savedXtkVersion, xtkInstruments ) {

    song.instruments = new Array( xtkInstruments.length );
    let xtkEq, xtkOD, xtkDelay, xtkFilter;

    xtkInstruments.forEach(( xtkInstrument, index ) => {

        xtkEq     = xtkInstrument[ INSTRUMENT_EQ ];
        xtkOD     = xtkInstrument[ INSTRUMENT_OD ];
        xtkDelay  = xtkInstrument[ INSTRUMENT_DELAY ];
        xtkFilter = xtkInstrument[ INSTRUMENT_FILTER ];

        song.instruments[ index ] = {
            id         : xtkInstrument[ INSTRUMENT_ID ],
            name       : xtkInstrument[ INSTRUMENT_NAME ],
            presetName : xtkInstrument[ INSTRUMENT_PRESET_NAME ],
            volume     : xtkInstrument[ INSTRUMENT_VOLUME ],
            panning    : xtkInstrument[ INSTRUMENT_PANNING ] || 0,
            muted      : xtkInstrument[ INSTRUMENT_MUTED ] || false,
            solo       : xtkInstrument[ INSTRUMENT_SOLOD ] || false,
            delay      : {
                enabled  : xtkDelay[ INSTRUMENT_DELAY_ENABLED ],
                type     : xtkDelay[ INSTRUMENT_DELAY_TYPE ],
                cutoff   : parseFloat( xtkDelay[ INSTRUMENT_DELAY_CUTOFF ]),
                feedback : parseFloat( xtkDelay[ INSTRUMENT_DELAY_FEEDBACK ]),
                offset   : parseFloat( xtkDelay[ INSTRUMENT_DELAY_OFFSET ]),
                time     : parseFloat( xtkDelay[ INSTRUMENT_DELAY_TIME ])
            },
            filter     : {
                enabled   : xtkFilter[ INSTRUMENT_FILTER_ENABLED ],
                depth     : parseFloat( xtkFilter[ INSTRUMENT_FILTER_DEPTH ]),
                frequency : parseFloat( xtkFilter[ INSTRUMENT_FILTER_FREQUENCY ]),
                q         : parseFloat( xtkFilter[ INSTRUMENT_FILTER_Q ] ),
                speed     : parseFloat( xtkFilter[ INSTRUMENT_FILTER_SPEED ]),
                lfoType   : xtkFilter[ INSTRUMENT_FILTER_LFO_TYPE ],
                type      : xtkFilter[ INSTRUMENT_FILTER_TYPE ]
            },
            oscillators : new Array( xtkInstrument[ INSTRUMENT_OSCILLATORS].length )
        };

        // EQ and OD introduced in assembly version 3

        if ( savedXtkVersion >= 3 ) {
            song.instruments[ index ].eq = {
                enabled  : xtkEq[ INSTRUMENT_EQ_ENABLED ],
                lowGain  : xtkEq[ INSTRUMENT_EQ_LOW ],
                midGain  : xtkEq[ INSTRUMENT_EQ_MID ],
                highGain : xtkEq[ INSTRUMENT_EQ_HIGH ]
            };
            song.instruments[ index ].overdrive = {
                enabled : xtkOD[ INSTRUMENT_OD_ENABLED ],
                preBand : xtkOD[ INSTRUMENT_OD_PREBAND ],
                postCut : xtkOD[ INSTRUMENT_OD_POSTCUT ],
                color   : xtkOD[ INSTRUMENT_OD_COLOR ],
                drive   : xtkOD[ INSTRUMENT_OD_DRIVE ]
            };
        }

        xtkInstrument[ INSTRUMENT_OSCILLATORS ].forEach(( xtkOscillator, oIndex ) => {

            const osc = song.instruments[ index ].oscillators[ oIndex ] = {
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

            if ( savedXtkVersion >= 2 ) { // pitch envelope was introduced in version 2 of assembler

                osc.pitch = {
                    range   : xtkOscillator[ OSCILLATOR_PITCH ][ OSCILLATOR_PITCH_RANGE ],
                    attack  : xtkOscillator[ OSCILLATOR_PITCH ][ OSCILLATOR_ADSR_ATTACK ],
                    decay   : xtkOscillator[ OSCILLATOR_PITCH ][ OSCILLATOR_ADSR_DECAY ],
                    sustain : xtkOscillator[ OSCILLATOR_PITCH ][ OSCILLATOR_ADSR_SUSTAIN ],
                    release : xtkOscillator[ OSCILLATOR_PITCH ][ OSCILLATOR_ADSR_RELEASE ]
                };
            }
        });
    });
}

function disassembleInstruments( xtk, instruments ) {
    const xtkInstruments = xtk[ INSTRUMENTS ] = new Array( instruments.length );
    const xtkWaveforms   = xtk[ WAVE_TABLES ] = {};

    let xtkInstrument, delay, filter, eq, od,
        xtkDelay, xtkFilter, xtkEq, xtkOD, xtkOscillator, xtkADSR, xtkPitchADSR;

    instruments.forEach(( instrument, index ) => {

        xtkInstrument = xtkInstruments[ index ] = {};

        // these modules were only added in a later factory version
        // assert they exist by calling these functions

        InstrumentFactory.createOverdrive( instrument );
        InstrumentFactory.createEQ( instrument );

        delay  = instrument.delay;
        filter = instrument.filter;
        od     = instrument.overdrive;
        eq     = instrument.eq;

        xtkInstrument[ INSTRUMENT_ID ]          = instrument.id;
        xtkInstrument[ INSTRUMENT_NAME ]        = instrument.name;
        xtkInstrument[ INSTRUMENT_PRESET_NAME ] = instrument.presetName;
        xtkInstrument[ INSTRUMENT_VOLUME ]      = instrument.volume;
        xtkInstrument[ INSTRUMENT_PANNING ]     = instrument.panning;
        xtkInstrument[ INSTRUMENT_MUTED ]       = instrument.muted;
        xtkInstrument[ INSTRUMENT_SOLOD ]       = instrument.solo;

        xtkDelay  = xtkInstrument[ INSTRUMENT_DELAY ]  = {};
        xtkFilter = xtkInstrument[ INSTRUMENT_FILTER ] = {};
        xtkEq     = xtkInstrument[ INSTRUMENT_EQ ]     = {};
        xtkOD     = xtkInstrument[ INSTRUMENT_OD ]     = {};

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

        xtkEq[ INSTRUMENT_EQ_ENABLED ] = eq.enabled;
        xtkEq[ INSTRUMENT_EQ_LOW ]     = eq.lowGain;
        xtkEq[ INSTRUMENT_EQ_MID ]     = eq.midGain;
        xtkEq[ INSTRUMENT_EQ_HIGH ]    = eq.highGain;

        xtkOD[ INSTRUMENT_OD_ENABLED ] = od.enabled;
        xtkOD[ INSTRUMENT_OD_PREBAND ] = od.preBand;
        xtkOD[ INSTRUMENT_OD_POSTCUT ] = od.postCut;
        xtkOD[ INSTRUMENT_OD_COLOR ]   = od.color;
        xtkOD[ INSTRUMENT_OD_DRIVE ]   = od.drive;

        xtkInstrument[ INSTRUMENT_OSCILLATORS ] = new Array( instrument.oscillators.length );

        instrument.oscillators.forEach(( oscillator, oIndex ) => {

            xtkOscillator = xtkInstrument[ INSTRUMENT_OSCILLATORS ][ oIndex ] = {};

            xtkOscillator[ OSCILLATOR_ENABLED ]= oscillator.enabled;
            xtkADSR      = xtkOscillator[ OSCILLATOR_ADSR ]  = {};
            xtkPitchADSR = xtkOscillator[ OSCILLATOR_PITCH ] = {};

            // amplitude envelope

            xtkADSR[ OSCILLATOR_ADSR_ATTACK  ] = oscillator.adsr.attack;
            xtkADSR[ OSCILLATOR_ADSR_DECAY   ] = oscillator.adsr.decay;
            xtkADSR[ OSCILLATOR_ADSR_SUSTAIN ] = oscillator.adsr.sustain;
            xtkADSR[ OSCILLATOR_ADSR_RELEASE ] = oscillator.adsr.release;

            // pitch envelope (added in factory version 2, assert there is a pitch envelope for backwards compatibility)

            InstrumentFactory.createPitchEnvelope( oscillator );

            xtkPitchADSR[ OSCILLATOR_PITCH_RANGE ]  = oscillator.pitch.range;
            xtkPitchADSR[ OSCILLATOR_ADSR_ATTACK  ] = oscillator.pitch.attack;
            xtkPitchADSR[ OSCILLATOR_ADSR_DECAY   ] = oscillator.pitch.decay;
            xtkPitchADSR[ OSCILLATOR_ADSR_SUSTAIN ] = oscillator.pitch.sustain;
            xtkPitchADSR[ OSCILLATOR_ADSR_RELEASE ] = oscillator.pitch.release;

            // oscillator tuning

            xtkOscillator[ OSCILLATOR_DETUNE       ] = oscillator.detune;
            xtkOscillator[ OSCILLATOR_FINESHIFT    ] = oscillator.fineShift;
            xtkOscillator[ OSCILLATOR_OCTAVE_SHIFT ] = oscillator.octaveShift;
            xtkOscillator[ OSCILLATOR_VOLUME       ] = oscillator.volume;
            xtkOscillator[ OSCILLATOR_WAVEFORM     ] = oscillator.waveform;
            xtkOscillator[ OSCILLATOR_TABLE        ] = oscillator.table;

            // serialize the non-custom waveform and noise tables into the song
            // for use with Tiny player (and backwards compatibility in case of
            // later changes made to default waveforms)

            const waveform = oscillator.waveform;

            if ( ![ "CUSTOM", "NOISE" ].includes( waveform ) && !xtkWaveforms.hasOwnProperty( waveform )) {
                xtkWaveforms[ waveform ] = WaveTables[ waveform ] || {};
            }
        });
    });
}

function assemblePatterns( song, savedXtkVersion, xtk, tempo ) {

    song.patterns = new Array( xtk[ PATTERNS ].length );
    let pattern, channel, event;

    let eventIdAcc = 0, notePoolId, automationPoolId, eventData;
    let notePool = [], automationPool = [];
    if ( savedXtkVersion >= 4 ) {
        notePool = xtk[ NOTE_POOLS ].map(note => JSON.parse(note));
        automationPool = xtk[ AUTOMATION_POOLS ].map(automation => JSON.parse(automation));
    }

    xtk[ PATTERNS ].forEach(( xtkPattern, pIndex ) => {

        pattern = song.patterns[ pIndex ] = {
            steps: xtkPattern[ PATTERN_STEPS ],
            channels: xtkPattern[ PATTERN_CHANNELS ]
        };

        xtkPattern[ PATTERN_CHANNELS ].forEach(( xtkChannel, cIndex ) => {

            channel = pattern.channels[ cIndex ] = new Array( xtkChannel.length );

            xtkChannel.forEach(( xtkEvent, eIndex ) => {

                if ( xtkEvent ) {

                    // assembler version 4 introduced note and automation pooling
                    // to reduce file size, xtkEvent is a stringified reference to pool indices

                    if ( savedXtkVersion >= 4 && typeof xtkEvent === "string" ) {

                        [ notePoolId, automationPoolId ] = xtkEvent.split('|');

                        let mp = undefined;
                        if (automationPoolId) {
                            mp = { ...( automationPool[ parseFloat( automationPoolId ) ]) }
                        }
                        eventData = {
                            ...( notePool[ parseFloat( notePoolId ) ] || {} ),
                            [ EVENT_ID ]: ( ++eventIdAcc ),
                            [ EVENT_MODULE_AUTOMATION ]: mp,
                        };
                    }
                    else {
                        // legacy songs serialized events as unique Objects
                        eventData = xtkEvent;
                    }

                    event = {
                        action:     eventData[ EVENT_ACTION ],
                        id :        eventData[ EVENT_ID ],
                        instrument: eventData[ EVENT_INSTRUMENT ],
                        note:       eventData[ EVENT_NOTE ],
                        octave:     eventData[ EVENT_OCTAVE ],
                        recording:  false,
                        seq: {
                            playing: false,
                            mpLength: 0
                        },
                    };

                    EventUtil.setPosition( event, pattern, pIndex, eIndex, tempo, eventData[ EVENT_LENGTH ]);
                    const xtkAutomation = eventData[ EVENT_MODULE_AUTOMATION ];

                    if ( xtkAutomation) {
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
        });
    });
}

function disassemblePatterns( xtk, patterns ) {

    const xtkPatterns       = xtk[ PATTERNS ]   = new Array( patterns.length );
    const xtkNotePool       = xtk[ NOTE_POOLS ] = [];
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
                        poolRef += `|${poolObject(xtkAutomationPool, xtkAutomation)}`;
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
}

function poolObject( pool, object ) {
    const hash = JSON.stringify( object );
    let idx = pool.indexOf( hash );
    if ( idx === -1 ) {
        idx = pool.push( hash ) - 1;
    }
    return idx.toString();
}
