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
import Config from "@/config";
import OscillatorTypes from "@/definitions/oscillator-types";
import type { Instrument, InstrumentOscillator } from "@/model/types/instrument";
import { clone } from "@/utils/object-util";

import {
    INSTRUMENTS,
    INSTRUMENT_INDEX, INSTRUMENT_NAME, INSTRUMENT_PRESET_NAME, INSTRUMENT_VOLUME,
    INSTRUMENT_PANNING, INSTRUMENT_MUTED, INSTRUMENT_SOLOD,

    INSTRUMENT_DELAY, INSTRUMENT_DELAY_ENABLED, INSTRUMENT_DELAY_CUTOFF, INSTRUMENT_DELAY_DRY,
    INSTRUMENT_DELAY_FEEDBACK, INSTRUMENT_DELAY_OFFSET, INSTRUMENT_DELAY_TIME, INSTRUMENT_DELAY_TYPE,

    INSTRUMENT_FILTER, INSTRUMENT_FILTER_ENABLED, INSTRUMENT_FILTER_DEPTH, INSTRUMENT_FILTER_FREQUENCY,
    INSTRUMENT_FILTER_LFO_TYPE, INSTRUMENT_FILTER_Q, INSTRUMENT_FILTER_SPEED, INSTRUMENT_FILTER_TYPE,

    INSTRUMENT_EQ, INSTRUMENT_EQ_ENABLED, INSTRUMENT_EQ_LOW, INSTRUMENT_EQ_MID, INSTRUMENT_EQ_HIGH,

    INSTRUMENT_OD, INSTRUMENT_OD_ENABLED, INSTRUMENT_OD_PREBAND, INSTRUMENT_OD_POSTCUT,
    INSTRUMENT_OD_COLOR, INSTRUMENT_OD_DRIVE,

    INSTRUMENT_OSCILLATORS, OSCILLATOR_ENABLED, OSCILLATOR_ADSR, OSCILLATOR_PITCH, OSCILLATOR_PITCH_RANGE,

    OSCILLATOR_ADSR_ATTACK, OSCILLATOR_ADSR_DECAY, OSCILLATOR_ADSR_SUSTAIN, OSCILLATOR_ADSR_RELEASE,
    OSCILLATOR_DETUNE, OSCILLATOR_FINESHIFT, OSCILLATOR_OCTAVE_SHIFT, OSCILLATOR_VOLUME,
    OSCILLATOR_WAVEFORM, OSCILLATOR_SAMPLE, OSCILLATOR_TABLE
} from "@/model/serializers/instrument-serializer";

const InstrumentFactory =
{
    /**
     * create a new instrument Object
     *
     * @param {number} index unique identifier for instrument, relates to the
     *                 index of the instrument inside a song instrument-list
     * @param {string=} name optional name to use
     * @return {Instrument}
     */
    create( index: number, name?: string ): Instrument {
        const instrument: Instrument = {
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
                dry      : 1,
                cutoff   : 880,
                offset   : 0
            }
        };
        InstrumentFactory.createOverdrive( instrument );
        InstrumentFactory.createEQ( instrument );
        return instrument;
    },

    /**
     * deserializes the instrument list from a .XTK file
     */
    deserialize( xtk: any, savedXtkVersion: number ): Instrument[] {
        const xtkInstruments: any[]     = xtk[ INSTRUMENTS ];
        const instruments: Instrument[] = new Array( xtkInstruments.length );

        let xtkEq: any, xtkOD: any, xtkDelay: any, xtkFilter: any;

        xtkInstruments.forEach(( xtkInstrument: any, index: number ): void => {

            xtkEq     = xtkInstrument[ INSTRUMENT_EQ ];
            xtkOD     = xtkInstrument[ INSTRUMENT_OD ];
            xtkDelay  = xtkInstrument[ INSTRUMENT_DELAY ];
            xtkFilter = xtkInstrument[ INSTRUMENT_FILTER ];

            const xtkInstrumentIndex: number = xtkInstrument[ INSTRUMENT_INDEX ] ?? xtkInstrument.id; // was id in legacy versions, note index starts at 0
            const instrument: Instrument = InstrumentFactory.create( index );

            instruments[ index ] = {
                ...instrument,
                index      : xtkInstrumentIndex,
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
                    dry      : assertFloat( xtkDelay[ INSTRUMENT_DELAY_DRY ], 1 ), // non existing in legacy versions
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

            // EQ and OD introduced in ASSEMBLER_VERSION 3

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

            xtkInstrument[ INSTRUMENT_OSCILLATORS ].forEach(( xtkOscillator: any, oIndex: number ): void => {

                const osc: InstrumentOscillator = instruments[ index ].oscillators[ oIndex ] = {
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

                if ( savedXtkVersion >= 2 ) { // pitch envelope was introduced in ASSEMBLER_VERSION 2

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
     * create default overdrive properties
     * this was not present in legacy instruments
     */
    createOverdrive( instrument: Instrument ): void {
        if ( typeof instrument.overdrive === "object" ) {
            return;
        }
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
     */
    createEQ( instrument: Instrument ): void {
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
    createOscillator( enabled: boolean, type: OscillatorTypes = OscillatorTypes.SAW ): InstrumentOscillator {
        const oscillator: InstrumentOscillator = {
            enabled     : enabled,
            waveform    : type,
            table       : 0,  // created when CUSTOM type is used
            sample      : "", // created when SAMPLE type is used (is String name or Stringified XTK for saved instruments)
            volume      : 1,
            detune      : 0,
            octaveShift : 0,
            fineShift   : 0,
            adsr : {
                attack  : 0,
                decay   : 0,
                sustain : 0.75,
                release : 0.02 // a little release to prevent sudden pops when dragging over the keyboard
            }
        };
        InstrumentFactory.createPitchEnvelope( oscillator );

        return oscillator;
    },
    /**
     * create default pitch envelope properties in oscillator
     * this was not present in legacy instruments
     */
    createPitchEnvelope( oscillator: InstrumentOscillator ): void {
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
     * @param {InstrumentOscillator} oscillator
     * @param {number=} size optional WaveTable size, defaults to Config value
     * @return {Array<number>}
     */
    getTableForOscillator( oscillator: InstrumentOscillator, size: number ): number[] | number {
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
    loadPreset( instrumentPreset: Instrument, newInstrumentIndex: number, newInstrumentName: string ): Instrument {
        const newInstrument = clone( instrumentPreset ) as Instrument;
        newInstrument.index = newInstrumentIndex;
        newInstrument.name  = newInstrumentName;

        // legacy presets have no pitch envelopes, pan, EQ or overdrive, create now

        newInstrument.panning = newInstrument.panning || 0;
        newInstrument.oscillators.forEach(( oscillator: InstrumentOscillator ) => {
            InstrumentFactory.createPitchEnvelope( oscillator );
        });
        InstrumentFactory.createOverdrive( newInstrument );
        InstrumentFactory.createEQ( newInstrument );

        return newInstrument;
    }
};
export default InstrumentFactory;

/**
 * Ensures legacy stored instrument presets
 * contain all features added in later versions
 * TODO saved instruments should be deserialized so they go through InstrumentFactory.create() !
 */
export const createFromSaved = ( savedInstrument: Instrument ): Instrument => {
    const instrument = savedInstrument;
    if ( typeof instrument.delay.dry === "undefined" ) {
        instrument.delay.dry = 1; // new addition
    }
    return instrument;
};

/* internal definitions */

function assertFloat( value: string | number, fallback: number = 0 ): number {
    const parsedValue: number = parseFloat( value as string );
    return isNaN( parsedValue ) ? fallback : parsedValue;
}
