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
import InstrumentFactory from "@/model/factories/instrument-factory";
import { FACTORY_VERSION, LEGACY_VERSION } from "@/model/factories/song-factory";
import type { Instrument, InstrumentOscillator } from "@/model/types/instrument";
import type { EffluxSong } from "@/model/types/song";

export default
{
    /**
     * queries whether given Object is a valid song. NOTE: this is
     * NOT a deep check of all properties, but a basic check of the
     * songs outline
     *
     * @see SongFactory
     */
    isValid( song?: EffluxSong ): boolean {
        if ( !song ) {
            return false;
        }
        return typeof song.id      === "string"    &&
               typeof song.version === "number"    &&
               typeof song.meta    !== "undefined" &&
               Array.isArray( song.instruments )   &&
               Array.isArray( song.patterns );
    },
    /**
     * transforms a legacy Song so its description contains
     * all properties available to newer factory versions
     */
    transformLegacy( song?: EffluxSong ): EffluxSong {
        if ( !song || !song.instruments ) {
            return null;
        }

        if ( song.version === FACTORY_VERSION ) {
            return song; // latest version of factory, nothing to transform
        }
        song.version = LEGACY_VERSION;
        song.instruments.forEach(( instrument: Instrument ): void => {
            // panning and mute/solo controls added at a later stage

            instrument.muted   = false;
            instrument.solo    = false;
            instrument.panning = instrument.panning || 0;

            // pitch envelope was added in version 2 of SongAssemblyService

            instrument.oscillators.forEach(( oscillator: InstrumentOscillator ): void => {
                if ( typeof oscillator.pitch !== "object" ) {
                    InstrumentFactory.createPitchEnvelope( oscillator );
                }
            });

            // EQ and OD were added in version 3 of SongAssemblyService

            if ( typeof instrument.eq !== "object" ) {
                InstrumentFactory.createEQ( instrument );
            }

            if ( typeof instrument.overdrive !== "object" ) {
                InstrumentFactory.createOverdrive( instrument );
            }

            if ( typeof instrument.delay.dry !== "number" ) {
                instrument.delay.dry = 1.0; // delay dry control added in version 7 of SongAssemblyService
            }

            // @ts-expect-error Property 'id' does not exist on type 'Instrument'.
            if ( typeof instrument.index === "undefined" && typeof instrument.id === "number" ) {
                // @ts-expect-error Property 'id' does not exist on type 'Instrument'.
                instrument.index = instrument.id; // legacy songs used id for index
            }
        });

        for ( const pattern of song.patterns ) {
            for ( const channel of pattern.channels ) {
                channel.forEach(( event, eventIndex ) => {
                    if ( !event ) {
                        channel[ eventIndex ] = 0; // only EffluxAudioEvent or 0 are allowed, legacy songs used null
                    }
                });
            }
        }

        if ( !Array.isArray( song.samples )) {
            song.samples = [];
        }
        return song;
    }
};
