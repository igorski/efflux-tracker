import { describe, it, expect, vi } from "vitest";
import Config from "@/config";
import SongFactory from "@/model/factories/song-factory";
import { META_OBJECT, META_TIMING, serialize } from "@/model/serializers/song-serializer";
import { EffluxSongType } from "@/model/types/song";
import SongValidator from "@/model/validators/song-validator";
import { XTK_ASSEMBLER_VERSION } from "@/services/song-assembly-service";
import { createSample } from "../../mocks";

let mockFn: ( fnName: string, ...args: any ) => Promise<any>;
vi.mock( "@/model/factories/sample-factory", () => ({
    default: {
        deserialize: vi.fn(( ...args ) => Promise.resolve( mockFn( "deserialize", ...args ))),
    }
}));
vi.mock( "@/model/serializers/sample-serializer", () => ({
    serialize: vi.fn(( ...args ) => Promise.resolve( mockFn( "serialize", ...args ))),
}));

describe( "Song factory", () => {
    describe( "when constructing a new Song instance", () => {
        it( "should by default create a valid Song with the default instrument amount", () => {
            const song = SongFactory.create();
            expect( song.instruments ).toHaveLength( Config.INSTRUMENT_AMOUNT );
            expect( SongValidator.isValid( song )).toBe( true );
        });

        it( "should allow creation of Songs with custom instrument amounts", () => {
            const song = SongFactory.create( 6 );
            expect( song.instruments ).toHaveLength( 6 );
        });

        it( "should by default create a tracker-type Song", () => {
            const song = SongFactory.create();
            expect( song.type ).toEqual( EffluxSongType.TRACKER );
        });

        it( "should allow creation of jam session-type Songs", () => {
            const song = SongFactory.create( 6, EffluxSongType.JAM );
            expect( song.type ).toEqual( EffluxSongType.JAM );
        });
    });

    describe( "when assembling and disassembling a Song structure", () => {
        it( "should serialize all samples asynchronously", async () => {
            const song = SongFactory.create( 1 );
            song.samples = [ createSample( "foo" ), createSample( "bar" )];

            mockFn = vi.fn();
            await serialize( song );

            expect( mockFn ).toHaveBeenNthCalledWith( 1, "serialize", song.samples[ 0 ], 0, song.samples );
            expect( mockFn ).toHaveBeenNthCalledWith( 2, "serialize", song.samples[ 1 ], 1, song.samples );
        });

        it( "should deserialize all samples asynchronously", async () => {
            const song = SongFactory.create( 1 );
            song.samples = [ createSample( "foo" ), createSample( "bar" )];

            // @ts-expect-error fn is declared but never used
            mockFn = ( fn: string, item: any ): Promise<any> => Promise.resolve( item );
            const xtk = await serialize( song );

            mockFn = vi.fn();
            const songAssembled = await SongFactory.deserialize( xtk, XTK_ASSEMBLER_VERSION );

            expect( mockFn ).toHaveBeenNthCalledWith( 1, "deserialize", song.samples[ 0 ], 0, song.samples );
            expect( mockFn ).toHaveBeenNthCalledWith( 2, "deserialize", song.samples[ 1 ], 1, song.samples );
        });

        it( "should be able to serialize a Song without loss of data", async () => {
            const song = SongFactory.create( 4, EffluxSongType.JAM );

            song.meta.timing.tempo = 130.7;
            song.meta.timing.timeSigNumerator = 12;
            song.meta.timing.timeSigDenominator = 8;

            const xtk = await serialize( song );
      
            expect( await SongFactory.deserialize( xtk, XTK_ASSEMBLER_VERSION )).toEqual( song );
        });

        it( "should be able to deserialize a legacy song without timing structure in the meta data", async () => {
            const song = SongFactory.create( 4, EffluxSongType.JAM );

            const xtk = await serialize( song );
            xtk[ META_OBJECT ][ META_TIMING ] = 133.52;

            const deserialized = await SongFactory.deserialize( xtk, XTK_ASSEMBLER_VERSION );

            expect( deserialized.meta.timing ).toEqual({
                tempo: 133.52,
                timeSigNumerator: 4,
                timeSigDenominator: 4,
            });
        });
    });
});
