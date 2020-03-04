import EventFactory       from '@/model/factory/event-factory';
import PatternFactory     from '@/model/factory/pattern-factory';
import SongFactory        from '@/model/factory/song-factory';
import { ACTION_NOTE_ON } from '@/model/types/audio-event-def';

import { hasContent, updateEventOffsets } from '@/utils/song-util';

describe( 'SongUtil', () => {
    let song;

    beforeEach(() => {
        song = SongFactory.createSong(8);
    });


    it( 'should know whether or not a song has content', () => {
        // expected song not to have content as no events with an action were defined in any pattern
        expect(hasContent(song)).toBe(false);

        // add a note to the first available slot in the first
        // available channel of the first available pattern

        const firstEvent  = EventFactory.createAudioEvent();
        firstEvent.action = ACTION_NOTE_ON;
        song.patterns[ 0 ].channels[ 0 ][ 0 ] = firstEvent;

        expect(hasContent(song)).toBe(true);
    });

    it( 'should be able to update existing AudioEvent offsets recursively', () => {
        // generate a random multiplication ratio

        const ratio = Math.random();

        // add some extra channels

        song.patterns.push( PatternFactory.createEmptyPattern( 16 ));

        // generate some events

        const firstEvent  = EventFactory.createAudioEvent();
        firstEvent.action = ACTION_NOTE_ON;
        firstEvent.seq.startOffset        = 0;
        firstEvent.seq.startMeasureOffset = 10;
        firstEvent.seq.length             = 2.5;

        const expectedStartOffset1 = firstEvent.seq.startOffset * ratio;
        const expectedOffset1      = firstEvent.seq.startMeasureOffset * ratio;
        const expectedLength1      = firstEvent.seq.length * ratio;

        const secondEvent  = EventFactory.createAudioEvent();
        secondEvent.action = ACTION_NOTE_ON;
        secondEvent.seq.startOffset        = 2;
        secondEvent.seq.startMeasureOffset = 5;
        secondEvent.seq.length             = 1.5;

        const expectedStartOffset2 = secondEvent.seq.startOffset * ratio;
        const expectedOffset2      = secondEvent.seq.startMeasureOffset * ratio;
        const expectedLength2      = secondEvent.seq.length * ratio;

        song.patterns[ 0 ].channels[ 0 ][ 0 ] = firstEvent;
        song.patterns[ 1 ].channels[ 1 ][ 8 ] = secondEvent;

        updateEventOffsets( song.patterns, ratio );

        // asset results

        expect(expectedStartOffset1).toEqual(firstEvent.seq.startOffset);
        expect(expectedOffset1).toEqual(firstEvent.seq.startMeasureOffset);
        expect(expectedLength1).toEqual(firstEvent.seq.length);
        expect(expectedStartOffset2).toEqual(secondEvent.seq.startOffset);
        expect(expectedOffset2).toEqual(secondEvent.seq.startMeasureOffset);
        expect(expectedLength2).toEqual(secondEvent.seq.length);
    });
});
