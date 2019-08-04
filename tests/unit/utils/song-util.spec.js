import EventFactory   from '../../../src/model/factory/event-factory';
import PatternFactory from '../../../src/model/factory/pattern-factory';
import SongFactory    from '../../../src/model/factory/song-factory';
import SongUtil       from '../../../src/utils/song-util';

describe( 'SongUtil', () => {
    let song;

    beforeEach(() => {
        song = SongFactory.createSong(8);
    });


    it( 'should know whether or not a song has content', () => {
        // expected song not to have content as no events with an action were defined in any pattern
        expect(SongUtil.hasContent(song)).toBe(false);

        // add a note to the first available slot in the first
        // available channel of the first available pattern

        const firstEvent    = EventFactory.createAudioEvent();
        firstEvent.action = 1;
        song.patterns[ 0 ].channels[ 0 ][ 0 ] = firstEvent;

        expect(SongUtil.hasContent(song)).toBe(true);
    });

    it( 'should be able to update existing AudioEvent offsets recursively', () => {
        // generate a random multiplication ratio

        const ratio = Math.random();

        // add some extra channels

        song.patterns.push( PatternFactory.createEmptyPattern( 16 ));

        // generate some events

        const firstEvent  = EventFactory.createAudioEvent();
        firstEvent.action = 1;
        firstEvent.seq.startMeasureOffset = 10;
        firstEvent.seq.length             = 2.5;

        const expectedOffset1 = firstEvent.seq.startMeasureOffset * ratio;
        const expectedLength1 = firstEvent.seq.length * ratio;

        const secondEvent  = EventFactory.createAudioEvent();
        secondEvent.action = 1;
        secondEvent.seq.startMeasureOffset = 5;
        secondEvent.seq.length             = 1.5;

        const expectedOffset2 = secondEvent.seq.startMeasureOffset * ratio;
        const expectedLength2 = secondEvent.seq.length * ratio;

        song.patterns[ 0 ].channels[ 0 ][ 0 ] = firstEvent;
        song.patterns[ 1 ].channels[ 1 ][ 8 ] = secondEvent;

        SongUtil.updateEventOffsets( song.patterns, ratio );

        // asset results

        expect(expectedOffset1).toEqual(firstEvent.seq.startMeasureOffset);
        expect(expectedLength1).toEqual(firstEvent.seq.length);
        expect(expectedOffset2).toEqual(secondEvent.seq.startMeasureOffset);
        expect(expectedLength2).toEqual(secondEvent.seq.length);
    });
});
