/**
 * @jest-environment jsdom
 */
import SongFactory         from "@/model/factories/song-factory";
import SongValidator       from "@/model/validators/song-validator";
import SongAssemblyService from "@/services/song-assembly-service";

describe( "SongAssemblyService", () => {
    it( "should be able to disassemble a Song into a Stringified XTK", async () => {
        const song = SongFactory.create( 8 );
        const xtk  = await SongAssemblyService.disassemble( song );

        // expected Song to have been disassembled into a stringified XTK
        expect( typeof xtk ).toBe( "string" );
    });

    it( "should be able to assemble a stringified XTK into a valid Song", async () => {
        const song  = SongFactory.create( 8 );
        const xtk   = await SongAssemblyService.disassemble( song );
        const song2 = await SongAssemblyService.assemble( xtk );

        // expected XTK to have been assembled into a valid Song
        expect( SongValidator.isValid( song2 )).toBe( true );
    });

    it( "should be able to assemble and disassemble a Song without loss of data", async () => {
        const song  = SongFactory.create( 8 );
        const xtk   = await SongAssemblyService.disassemble( song );
        const song2 = await SongAssemblyService.assemble( xtk );

        // expected disassembled XTK to equal the properties of the song it was assembled from
        expect( song ).toEqual( song2 );
    });
});
