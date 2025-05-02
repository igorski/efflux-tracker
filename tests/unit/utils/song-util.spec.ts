import { describe, it, expect, beforeEach } from "vitest";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { ACTION_NOTE_ON } from "@/model/types/audio-event";
import { type EffluxSong, EffluxSongType } from "@/model/types/song";

import { convertSongType, hasContent, updateEventOffsets } from "@/utils/song-util";

describe( "SongUtil", () => {
    let song: EffluxSong;

    beforeEach(() => {
        song = SongFactory.create( 8 );
    });

    it( "should know whether or not a song has content", () => {
        // expected song not to have content as no events with an action were defined in any pattern
        expect( hasContent( song )).toBe( false );

        // add a note to the first available slot in the first
        // available channel of the first available pattern

        const firstEvent  = EventFactory.create();
        firstEvent.action = ACTION_NOTE_ON;
        song.patterns[ 0 ].channels[ 0 ][ 0 ] = firstEvent;

        expect( hasContent( song )).toBe( true );
    });

    it( "should be able to update existing AudioEvent offsets recursively", () => {
        // generate a random multiplication ratio

        const ratio = Math.random();

        // add some extra channels

        song.patterns.push( PatternFactory.create( 16 ));

        // generate some events

        const firstEvent  = EventFactory.create();
        firstEvent.action = ACTION_NOTE_ON;
        firstEvent.seq.startMeasureOffset = 10;
        firstEvent.seq.length             = 2.5;

        const expectedOffset1      = firstEvent.seq.startMeasureOffset * ratio;
        const expectedLength1      = firstEvent.seq.length * ratio;

        const secondEvent  = EventFactory.create();
        secondEvent.action = ACTION_NOTE_ON;
        secondEvent.seq.startMeasureOffset = 5;
        secondEvent.seq.length             = 1.5;

        const expectedOffset2 = secondEvent.seq.startMeasureOffset * ratio;
        const expectedLength2 = secondEvent.seq.length * ratio;

        song.patterns[ 0 ].channels[ 0 ][ 0 ] = firstEvent;
        song.patterns[ 1 ].channels[ 1 ][ 8 ] = secondEvent;

        updateEventOffsets( song.patterns, ratio );

        // asset results

        expect( expectedOffset1 ).toEqual( firstEvent.seq.startMeasureOffset );
        expect( expectedLength1 ).toEqual( firstEvent.seq.length );
        expect( expectedOffset2 ).toEqual( secondEvent.seq.startMeasureOffset );
        expect( expectedLength2 ).toEqual( secondEvent.seq.length );
    });

    describe( "when converting song types", () => {
        it( "should be able to create the appropriate range of orders when converting from TRACKER to JAM mode", () => {
            song = SongFactory.create( 8, EffluxSongType.TRACKER );

            expect( song.patterns ).toHaveLength( 1 );
            expect( song.order ).toHaveLength( 1 );

            convertSongType( song, EffluxSongType.JAM );

            expect( song.patterns ).toHaveLength( 8 );
            expect( song.order ).toHaveLength( 8 );
        });

        it( "should be able to sanitize the patterns when converting from JAM to TRACKER mode", () => {
            song = SongFactory.create( 8, EffluxSongType.JAM );

            expect( song.patterns[ 0 ].steps ).toEqual( 16 );

            // first pattern has 17 events in first and last channel
            song.patterns[ 0 ].channels[ 0 ].push( EventFactory.create() );
            song.patterns[ 0 ].channels[ 7 ].push( EventFactory.create() );

            convertSongType( song, EffluxSongType.TRACKER );

            for ( let i = 0; i < 8; ++i ) {
                expect( song.patterns[ 0 ].channels[ i ]).toHaveLength( 16  );
            }
        });
    });
});
