import { describe, it, expect, vi } from "vitest";
import SongFactory from "@/model/factories/song-factory";
import { serialize } from "@/model/serializers/song-serializer";
import type { Sample } from "@/model/types/sample";
import SongValidator from "@/model/validators/song-validator";
import { ASSEMBLER_VERSION } from "@/services/song-assembly-service";
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
    it( "should be able to create a Song", () => {
        const song = SongFactory.create( 6 );
        expect( song.instruments ).toHaveLength( 6 );
        expect( SongValidator.isValid( song )).toBe( true );
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
            const songAssembled = await SongFactory.deserialize( xtk, ASSEMBLER_VERSION );

            expect( mockFn ).toHaveBeenNthCalledWith( 1, "deserialize", song.samples[ 0 ], 0, song.samples );
            expect( mockFn ).toHaveBeenNthCalledWith( 2, "deserialize", song.samples[ 1 ], 1, song.samples );
        });

        it( "should be able to serialize a Song without loss of data", async () => {
            const song = SongFactory.create( 8 );

            const xtk = await serialize( song );
            expect( await SongFactory.deserialize( xtk, ASSEMBLER_VERSION )).toEqual( song );
        });
    });
});
