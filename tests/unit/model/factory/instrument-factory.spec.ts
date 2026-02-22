import { describe, it, expect } from "vitest";
import Config from "@/config";
import InstrumentFactory, { upgradeLegacy } from "@/model/factories/instrument-factory";
import { serialize } from "@/model/serializers/instrument-serializer";
import { type InstrumentOscillator } from "@/model/types/instrument";
import InstrumentValidator from "@/model/validators/instrument-validator";
import { XTK_ASSEMBLER_VERSION } from "@/services/song-assembly-service";
import { clone } from "@/utils/object-util";

describe( "InstrumentFactory", () => {
    it( "should be able to create a valid Instrument", () => {
        const instrument = InstrumentFactory.create( 0, "foo" );

        expect( InstrumentValidator.isValid( instrument )).toBe( true );
    });

    describe( "when retrieving the table for an oscillator", () => {
        it( "should be able to retrieve an existing WaveTable for an oscillator", () => {
            const oscillator = InstrumentFactory.createOscillator( true );
            const table = oscillator.table = new Array( Config.WAVE_TABLE_SIZE ) as number[];

            // expected InstrumentFactory to have returned the set WaveTable unchanged
            expect( table ).toEqual( InstrumentFactory.getTableForOscillator( oscillator ));
        });

        it( "should be able to create a new WaveTable for an oscillator when the requested table size is different to the existing table size", () => {
            const oscillator = InstrumentFactory.createOscillator( true );
            oscillator.table = new Array( Config.WAVE_TABLE_SIZE ) as number[];

            // expected InstrumentFactory to have returned the set WaveTable unchanged
            const table = InstrumentFactory.getTableForOscillator( oscillator, Config.WAVE_TABLE_SIZE / 2 );
            expect( table ).toHaveLength( Config.WAVE_TABLE_SIZE / 2 );
        });

        it( "should be able to lazily create a WaveTable for an oscillator", () => {
            const oscillator = InstrumentFactory.createOscillator( true );
            const table = InstrumentFactory.getTableForOscillator( oscillator );

            // expected InstrumentFactory to have generated a WaveTable unchanged
            expect( table instanceof Array ).toBe( true );

            const tableArr = table as number[];

            let i = tableArr.length;
            while ( i-- ) {
                // expected generated WaveTable to contain silence
                expect( tableArr[ i ]).toEqual( 0 );
            }
        });

        it( "should be able to generate a WaveTable for an oscillator at any given size", () => {
            const oscillator = InstrumentFactory.createOscillator( true );
            const size = Math.round(Math.random() * 500) + 1;
            const table = InstrumentFactory.getTableForOscillator( oscillator, size );

            // expected InstrumentFactory to have generated a WaveTable of requested size
            expect( table as number[] ).toHaveLength( size );
        });
    });

    it( "should add the pitch envelope section to legacy instruments", () => {
        const instrument = InstrumentFactory.create( 0, "foo" );

        // ensure no pitch envelopes exist

        instrument.oscillators.forEach( oscillator => {
            delete oscillator.pitch;
        });

        const clonedInstrument = InstrumentFactory.loadPreset( instrument, 1, "bar" );

        clonedInstrument.oscillators.forEach( oscillator => {
            expect( typeof oscillator.pitch ).toBe( "object" );
        });
    });

    it( "should be able to serialize an instrument list without loss of data", () => {
        const instrument1 = InstrumentFactory.create( 0, "foo" );
        const instrument2 = InstrumentFactory.create( 0, "bar" );

        const instruments = [ instrument1, instrument2 ];
        const xtk = {};

        serialize( xtk, instruments );
        expect( InstrumentFactory.deserialize( xtk, XTK_ASSEMBLER_VERSION )).toEqual( instruments );
    });

    describe( "when upgrading legacy instruments", () => {
        it( "should leave a modern instrument unchanged", () => {
            const instrument = InstrumentFactory.create( 0 );

            instrument.panning = 1;
            instrument.delay.dry = 0.5;
            instrument.delay.sync = true;

            const orgPitches = instrument.oscillators.map( oscillator => clone( oscillator.pitch ));
            const orgDelay = clone( instrument.delay );
            const orgEQ = clone( instrument.eq );
            const orgOD = clone( instrument.overdrive );

            upgradeLegacy( instrument );

            expect( instrument.panning ).toEqual( 1 );
            instrument.oscillators.forEach(( oscillator: InstrumentOscillator, index: number ) => {
                expect( oscillator.pitch ).toEqual( orgPitches[ index ]);
            });
            expect( instrument.delay ).toEqual( orgDelay );
            expect( instrument.eq ).toEqual( orgEQ );
            expect( instrument.overdrive ).toEqual( orgOD );
        });

        it( "should add all later enhancement to a legacy instrument", () => {
            const instrument = InstrumentFactory.create( 0 );

            delete instrument.panning;

            for ( const oscillator of instrument.oscillators ) {
                delete oscillator.pitch;
            }
            delete instrument.delay.dry;
            delete instrument.delay.sync;
            delete instrument.eq;
            delete instrument.overdrive;

            upgradeLegacy( instrument );

            expect( instrument.panning ).toEqual( 0 );
            for ( const oscillator of instrument.oscillators ) {
                expect( oscillator.pitch ).toBeInstanceOf( Object );
            }
            expect( instrument.delay.dry ).toEqual( 1 );
            expect( instrument.delay.sync ).toEqual( false );
            expect( instrument.eq ).toBeInstanceOf( Object );
            expect( instrument.overdrive ).toBeInstanceOf( Object );
        });
    });
});
