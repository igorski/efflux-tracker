/**
 * @jest-environment jsdom
 */
import SongFactory from "@/model/factories/song-factory";
import { serialize } from "@/model/serializers/song-serializer";
import SongValidator from "@/model/validators/song-validator";
import { ASSEMBLER_VERSION } from "@/services/song-assembly-service";

let mockFn;
jest.mock( "@/model/factories/sample-factory", () => ({
    deserialize: jest.fn(( ...args ) => mockFn( "deserialize", ...args )),
}));
jest.mock( "@/model/serializers/sample-serializer", () => ({
    serialize: jest.fn(( ...args ) => mockFn( "serialize", ...args ))
}))

describe( "Song factory", () => {
    it( "should be able to create a Song", () => {
        const song = SongFactory.create( 6 );
        expect( song.instruments ).toHaveLength( 6 );
        expect( SongValidator.isValid( song )).toBe( true );
    });

    describe( "when assembling and disassembling a Song structure", () => {
        it( "should serialize all samples asynchronously", async () => {
            const song = SongFactory.create( 1 );
            song.samples = [{ name: "foo" }, { name: "bar" }];

            mockFn = jest.fn();
            await serialize( song );

            expect( mockFn ).toHaveBeenNthCalledWith( 1, "serialize", song.samples[ 0 ], 0, song.samples );
            expect( mockFn ).toHaveBeenNthCalledWith( 2, "serialize", song.samples[ 1 ], 1, song.samples );
        });

        it( "should deserialize all samples asynchronously", async () => {
            const song = SongFactory.create( 1 );
            song.samples = [{ name: "foo" }, { name: "bar" }];

            mockFn = ( fn, item ) => Promise.resolve( item );
            const xtk = await serialize( song );

            mockFn = jest.fn();
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
