import SongFactory         from '@/model/factories/song-factory';
import SongValidator       from '@/model/validators/song-validator';
import SongAssemblyService from '@/services/song-assembly-service';

describe( 'SongAssemblyService', () => {
    it( 'should be able to disassemble a Song into a Stringified XTK', () => {
        const song = SongFactory.createSong( 8 );
        const xtk  = SongAssemblyService.disassemble( song );

        expect(typeof xtk).toBe('string'); // expected Song to have been disassembled into a stringified XTK
    });

    it( 'should be able to assemble a stringified XTK into a valid Song', () => {
        const song  = SongFactory.createSong( 8 );
        const xtk   = SongAssemblyService.disassemble( song );
        const song2 = SongAssemblyService.assemble( xtk );

        expect(SongValidator.isValid( song2 )).toBe(true); // expected XTK to have been assembled into a valid Song but it didn't pass validation
    });

    it( 'should be able to assemble and disassemble a Song without loss of data', () => {
        const song  = SongFactory.createSong( 8 );
        const xtk   = SongAssemblyService.disassemble( song );
        const song2 = SongAssemblyService.assemble( xtk );

        expect(song).toEqual(song2); // expected disassembled XTK to equal the properties of the song it was assembled from
    });
});
