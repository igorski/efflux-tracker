import SongFactory from "@/model/factories/song-factory";
import SongValidator from "@/model/validators/song-validator";
import { ASSEMBLER_VERSION } from "@/services/song-assembly-service";

let mockFn;
jest.mock( "@/model/factories/sample-factory", () => ({
    assemble: jest.fn(( ...args ) => mockFn( "assemble", ...args )),
    disassemble: jest.fn(( ...args ) => mockFn( "disassemble", ...args ))
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
            song.samples = [{ name: "foo" }, { name: "bar" }];

            mockFn = jest.fn();
            await SongFactory.disassemble( song );

            expect( mockFn ).toHaveBeenNthCalledWith( 1, "disassemble", song.samples[ 0 ], 0, song.samples );
            expect( mockFn ).toHaveBeenNthCalledWith( 2, "disassemble", song.samples[ 1 ], 1, song.samples );
        });

        it( "should deserialize all samples asynchronously", async () => {
            const song = SongFactory.create( 1 );
            song.samples = [{ name: "foo" }, { name: "bar" }];

            mockFn = ( fn, item ) => Promise.resolve( item );
            const xtk = await SongFactory.disassemble( song );

            mockFn = jest.fn();
            const songAssembled = await SongFactory.assemble( xtk, ASSEMBLER_VERSION );

            expect( mockFn ).toHaveBeenNthCalledWith( 1, "assemble", song.samples[ 0 ], 0, song.samples );
            expect( mockFn ).toHaveBeenNthCalledWith( 2, "assemble", song.samples[ 1 ], 1, song.samples );
        });

        it( "should be able to disassemble an assembled song without loss of data", async () => {
            const song = SongFactory.create( 8 );

            const xtk = await SongFactory.disassemble( song );
            expect( await SongFactory.assemble( xtk, ASSEMBLER_VERSION )).toEqual( song );
        });
    });
});
