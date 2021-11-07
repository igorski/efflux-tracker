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
import Config from "@/config";
import OscillatorTypes from "@/definitions/oscillator-types";
import WaveTables from "@/services/audio/wave-tables";
import { clone } from "@/utils/object-util";

const InstrumentFactory =
{
    /**
     * create a new instrument Object
     *
     * @param {number} index unique identifier for instrument, relates to the
     *                 index of the instrument inside a song instrument-list
     * @param {string=} name optional name to use
     * @return {INSTRUMENT}
     */
    create( index, name ) {
        const instrument = {
            index,
            name : ( typeof name === "string" ) ? name : `Instrument ${( index + 1 ).toString()}`,
            presetName: null,
            oscillators : [
                InstrumentFactory.createOscillator( true,  OscillatorTypes.TRIANGLE ),
                InstrumentFactory.createOscillator( false, OscillatorTypes.SINE ),
                InstrumentFactory.createOscillator( false, OscillatorTypes.SAW )
            ],
            volume: 1,
            panning: 0, // -1 = left, 0 = center, 1 = right
            solo: false,
            muted: false,
            filter : {
                enabled     : false,
                frequency   : Config.DEFAULT_FILTER_FREQ,
                q           : Config.DEFAULT_FILTER_Q,
                speed       : Config.DEFAULT_FILTER_LFO_SPEED,
                depth       : Config.DEFAULT_FILTER_LFO_DEPTH,
                type        : "lowpass",
                lfoType     : "off"
            },
            delay : {
                enabled  : false,
                type     : 0,
                time     : 0.5,
                feedback : 0.5,
                cutoff   : 880,
                offset   : 0
            }
        };
        InstrumentFactory.createOverdrive( instrument );
        InstrumentFactory.createEQ( instrument );
        return instrument;
    },

    /**
     * assembles an instrument list from an .XTK file
     *
     * @param {Object} xtk
     * @param {Number} savedXtkVersion
     * @return {Array<INSTRUMENT>}
     */
    assemble( xtk, savedXtkVersion ) {
        const xtkInstruments = xtk[ INSTRUMENTS ];
        const instruments    = new Array( xtkInstruments.length );
        let xtkEq, xtkOD, xtkDelay, xtkFilter;

        xtkInstruments.forEach(( xtkInstrument, index ) => {

            xtkEq     = xtkInstrument[ INSTRUMENT_EQ ];
            xtkOD     = xtkInstrument[ INSTRUMENT_OD ];
            xtkDelay  = xtkInstrument[ INSTRUMENT_DELAY ];
            xtkFilter = xtkInstrument[ INSTRUMENT_FILTER ];

            const instrument = InstrumentFactory.create();

            instruments[ index ] = {
                ...instrument,
                index      : xtkInstrument[ INSTRUMENT_INDEX ] ?? xtkInstrument.id, // was id in legacy versions, note index starts at 0
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
                instruments[ index ].eq = {
                    enabled  : xtkEq[ INSTRUMENT_EQ_ENABLED ],
                    lowGain  : xtkEq[ INSTRUMENT_EQ_LOW ],
                    midGain  : xtkEq[ INSTRUMENT_EQ_MID ],
                    highGain : xtkEq[ INSTRUMENT_EQ_HIGH ]
                };
                instruments[ index ].overdrive = {
                    enabled : xtkOD[ INSTRUMENT_OD_ENABLED ],
                    preBand : xtkOD[ INSTRUMENT_OD_PREBAND ],
                    postCut : xtkOD[ INSTRUMENT_OD_POSTCUT ],
                    color   : xtkOD[ INSTRUMENT_OD_COLOR ],
                    drive   : xtkOD[ INSTRUMENT_OD_DRIVE ]
                };
            }

            xtkInstrument[ INSTRUMENT_OSCILLATORS ].forEach(( xtkOscillator, oIndex ) => {

                const osc = instruments[ index ].oscillators[ oIndex ] = {
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
                    sample      : xtkOscillator[ OSCILLATOR_SAMPLE ] || "", // added in version 6
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
        return instruments;
    },

    /**
     * disassembles an instrument list into an .XTK file
     *
     * @param {Object} xtk to serialize into
     * @param {Array<INSTRUMENT>} instruments
     */
    disassemble( xtk, instruments ) {
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

            xtkInstrument[ INSTRUMENT_INDEX ]       = instrument.index;
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

                // oscillator properties

                xtkOscillator[ OSCILLATOR_DETUNE       ] = oscillator.detune;
                xtkOscillator[ OSCILLATOR_FINESHIFT    ] = oscillator.fineShift;
                xtkOscillator[ OSCILLATOR_OCTAVE_SHIFT ] = oscillator.octaveShift;
                xtkOscillator[ OSCILLATOR_VOLUME       ] = oscillator.volume;
                xtkOscillator[ OSCILLATOR_WAVEFORM     ] = oscillator.waveform;
                xtkOscillator[ OSCILLATOR_SAMPLE       ] = oscillator.sample;
                xtkOscillator[ OSCILLATOR_TABLE        ] = oscillator.table;

                // serialize the non-custom waveform and noise tables into the song
                // for use with Tiny player (and backwards compatibility in case of
                // later changes made to default waveforms)

                const waveform = oscillator.waveform;

                if ( ![ OscillatorTypes.CUSTOM, OscillatorTypes.NOISE ].includes( waveform ) &&
                     !Object.prototype.hasOwnProperty.call( xtkWaveforms, waveform )) {
                    xtkWaveforms[ waveform ] = WaveTables[ waveform ] || {};
                }
            });
        });
    },

    /**
     * create default overdrive properties
     * this was not present in legacy instruments
     *
     * @param {INSTRUMENT} instrument
     */
    createOverdrive( instrument ) {
        if ( typeof instrument.overdrive === "object" ) return;

        instrument.overdrive = {
            enabled: false,
            preBand: 1.0,
            postCut: 8000,
            color:   4000,
            drive:   0.8
        };
    },
    /**
     * create default equalizer properties
     * this was not present in legacy instruments
     *
     * @param {INSTRUMENT} instrument
     */
    createEQ( instrument ) {
        if ( typeof instrument.eq === "object" ) {
            return;
        }
        instrument.eq = {
            enabled  : false,
            lowGain  : 1,
            midGain  : 1,
            highGain : 1
        };
    },
    /**
     * @param {boolean} enabled
     * @param {string} type
     * @return {INSTRUMENT_OSCILLATOR}
     */
    createOscillator( enabled, type = OscillatorTypes.SAW ) {
        const oscillator = {
            enabled     : enabled,
            waveform    : type,
            table       : 0,  // created when CUSTOM type is used
            sample      : "", // created when SAMPLE type is used (is String name)
            volume      : 1,
            detune      : 0,
            octaveShift : 0,
            fineShift   : 0,
            adsr : {
                attack  : 0,
                decay   : 0,
                sustain : 0.75,
                release : 0
            }
        };
        InstrumentFactory.createPitchEnvelope( oscillator );

        return oscillator;
    },
    /**
     * create default pitch envelope properties in oscillator
     * this was not present in legacy instruments
     *
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     */
    createPitchEnvelope( oscillator ) {
        if ( typeof oscillator.pitch === "object" ) {
            return;
        }
        oscillator.pitch = {
            range   : 0,
            attack  : 0,
            decay   : 1,
            sustain : 0.75,
            release : 0
        };
    },
    /**
     * lazily retrieve the custom WaveTable for given oscillator, if
     * it wasn't created yet, it is created here
     *
     * @param {INSTRUMENT_OSCILLATOR} oscillator
     * @param {number=} size optional WaveTable size, defaults to Config value
     * @return {Array<number>}
     */
    getTableForOscillator( oscillator, size ) {
        if ( !oscillator.table ) {
            if ( typeof size !== "number" ) {
                size = Config.WAVE_TABLE_SIZE;
            }
            oscillator.table = new Array( size );

            while ( size-- ) {
                oscillator.table[ size ] = 0;
            }
        }
        return oscillator.table;
    },
    /**
     * @param {Object} instrumentPreset
     * @param {number} newInstrumentIndex
     * @param {string} newInstrumentName
     * @return {INSTRUMENT}
     */
    loadPreset( instrumentPreset, newInstrumentIndex, newInstrumentName ) {
        const newInstrument = clone( instrumentPreset );
        newInstrument.index = newInstrumentIndex;
        newInstrument.name  = newInstrumentName;

        // legacy presets have no pitch envelopes, pan, EQ or overdrive, create now

        newInstrument.panning = newInstrument.panning || 0;
        newInstrument.oscillators.forEach(( oscillator ) => InstrumentFactory.createPitchEnvelope( oscillator ));
        InstrumentFactory.createOverdrive( newInstrument );
        InstrumentFactory.createEQ( newInstrument );

        return newInstrument;
    }
};
export default InstrumentFactory;

/* internal definitions */

const INSTRUMENTS     = "ins",

      INSTRUMENT_INDEX            = "i",
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
      OSCILLATOR_SAMPLE       = "ws",
      OSCILLATOR_TABLE        = "t";
