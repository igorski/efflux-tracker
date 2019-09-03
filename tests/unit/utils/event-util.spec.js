import EventUtil      from '@/utils/event-util';
import LinkedList     from '@/utils/linked-list';
import EventFactory   from '@/model/factory/event-factory';
import PatternFactory from '@/model/factory/pattern-factory';
import SongFactory    from '@/model/factory/song-factory';

describe( 'EventUtil', () => {
    let song;

    beforeEach(() => {
        song = SongFactory.createSong(8);
    });

    /* actual unit tests */

    it( 'should, when no length is given, calculate the duration as the minimum unit relative to the patterns length', () => {
        const pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const audioEvent = EventFactory.createAudioEvent();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, song.meta.tempo );

        const measureLength  = ( 60 / song.meta.tempo ) * 4;
        let expectedLength = ( 1 / pattern.steps ) * measureLength;

        expect(expectedLength).toEqual(audioEvent.seq.length);

        // increase pattern size

        pattern.steps  *= 2;
        expectedLength = ( 1 / pattern.steps ) * measureLength;

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, song.meta.tempo );

        expect(expectedLength).toEqual(audioEvent.seq.length);
    });

    it( 'should be able to update the position of a AudioEvent', () => {
        const pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const expectedStartMeasure       = 0;
        const expectedStartMeasureOffset = 1; // half in measure (measure lasts 2s at 120 BPM)
        const expectedEndMeasure         = 0;
        const expectedLength             = .5;

        const audioEvent = EventFactory.createAudioEvent();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 2, song.meta.tempo, expectedLength );

        expect(expectedStartMeasure).toEqual(audioEvent.seq.startMeasure);
        expect(expectedStartMeasureOffset).toEqual(audioEvent.seq.startMeasureOffset);
        expect(expectedEndMeasure).toEqual(audioEvent.seq.endMeasure);
        expect(expectedLength).toEqual(audioEvent.seq.length);
    });

    it( 'should be able to update the position of an AudioEvent that spans several measures in duration', () => {
        const pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const expectedStartMeasure       = 0;
        const expectedStartMeasureOffset = .5; // a quarter note into measure (measure lasts 2s at 120 BPM)
        const expectedLength             = 4;  // duration is 4 seconds (2 measures at 120 BPM)
        const expectedEndMeasure         = 2;  // events duration exceeds 2 measures (each at 2s at 120 BPM)

        const audioEvent = EventFactory.createAudioEvent();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, song.meta.tempo, expectedLength );

        expect(expectedStartMeasure).toEqual(audioEvent.seq.startMeasure);
        expect(expectedStartMeasureOffset).toEqual(audioEvent.seq.startMeasureOffset);
        expect(expectedEndMeasure).toEqual(audioEvent.seq.endMeasure);
        expect(expectedLength).toEqual(audioEvent.seq.length);
    });

    it( 'should be able to clear the AudioEvent content for any requested step position', () => {
        const patternIndex = 0;
        const pattern      = song.patterns[ patternIndex ];

        // generate some note content

        const pchannel1 = pattern.channels[ 0 ];
        const pchannel2 = pattern.channels[ 1 ];

        // create some AudioEvents

        const expected1 = pchannel1[ 0 ] = EventFactory.createAudioEvent( 1, 'E', 2, 1 );
        const expected2 = pchannel1[ 1 ] = EventFactory.createAudioEvent( 1, 'F', 3, 1 );
        const expected3 = pchannel2[ 0 ] = EventFactory.createAudioEvent( 1, 'F#',4, 1 );
        const expected4 = pchannel2[ 1 ] = EventFactory.createAudioEvent( 1, 'G', 5, 1 );

        // start clearing individual events and asserting the results

        EventUtil.clearEvent( song, patternIndex, 0, 0 );

        expect(expected1).not.toEqual(pchannel1[ 0 ]);
        expect(0).toEqual(pchannel1[ 0 ]); // event should now be 0

        EventUtil.clearEvent( song, patternIndex, 1, 0 );

        expect(expected3).not.toEqual(pchannel2[ 0 ]);
        expect(0).toEqual(pchannel2[ 0 ]); // event should now be 0

        // assert remaining events are still existent

        expect(expected2).toEqual(pchannel1[ 1 ]);
        expect(expected4).toEqual(pchannel2[ 1 ]);
    });

    it( 'should be able to remove the AudioEvent from the cached LinkedList when clearing the event', () => {
        const patternIndex = 0;
        const pattern      = song.patterns[ patternIndex ];

        // generate some note content

        const pchannel1 = pattern.channels[ 0 ];
        const pchannel2 = pattern.channels[ 1 ];

        // create some AudioEvents

        const expected1 = pchannel1[ 0 ] = EventFactory.createAudioEvent( 1, 'E', 2, 1 );
        const expected2 = pchannel2[ 1 ] = EventFactory.createAudioEvent( 1, 'F', 3, 1 );

        const list = new LinkedList();

        const expected2node = list.add( expected2 );

        EventUtil.clearEvent( song, patternIndex, 0, 0, list );
        expect(null).toEqual(list.getNodeByData( expected1 ));

        expect(expected2node).toEqual(list.getNodeByData( expected2 ));

        EventUtil.clearEvent( song, patternIndex, 1, 1, list );
        expect(null).toEqual(list.getNodeByData( expected2 ));
    });

    it( 'should be able to retrieve the first event before the given event', () => {
        const channelEvents = [];

        const event1 = EventFactory.createAudioEvent();
        const event2 = EventFactory.createAudioEvent();
        const event3 = EventFactory.createAudioEvent();

        channelEvents.push( event1 ); // step 0
        channelEvents.push( null );   // step 1
        channelEvents.push( event2 ); // step 2
        channelEvents.push( event3 ); // step 3

        expect(event2).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 3 ));
        expect(event1).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 2 ));
        expect(event1).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 1 ));
        expect(null).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 0 ));
    });

    it( 'should be able to retrieve the first event before the given event that matches given compare function', () => {
        const channelEvents = [];

        const event1 = EventFactory.createAudioEvent();
        const event2 = EventFactory.createAudioEvent();
        const event3 = EventFactory.createAudioEvent();

        event1.mp = { 'foo': 'bar' };

        channelEvents.push( event1 ); // step 0
        channelEvents.push( event2 ); // step 1
        channelEvents.push( event3 ); // step 2

        expect(event1).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 2, ( compareEvent ) => {
            return compareEvent.mp && compareEvent.mp.foo === 'bar';
        }));
    });

    it( 'should update the sequence length of the previous event when linking a new event in the linked event list', () => {
        const patternIndex  = 0;
        const channelIndex  = 0;
        const lists         = [ new LinkedList() ]; // just a single list (we'll test on channel 0)
        song.meta.tempo     = 120; // 120 BPM means each measure lasts for 2 seconds

        const event1step = 0; // step 0 is at start offset of 0 seconds
        const event2step = 8; // step 8 is at start offset of 1 second (half a 16 step measure at 120 BPM)

        const event1 = createNoteOnEvent( event1step, song, patternIndex, channelIndex, lists );

        createNoteOnEvent( event2step, song, patternIndex, channelIndex, lists );

        expect(1).toEqual(event1.seq.length); // expected event 1 sequence length to have been updated to match

        // insert new event in between

        const event3step = 4; // step 4 is at start offset 0.5 seconds (quarter of a 16 step measure at 120 BPM)
        createNoteOnEvent( event3step, song, patternIndex, channelIndex, lists );

        expect(.5).toEqual(event1.seq.length); // expected event 1 sequence length to have been updated to match insertion before previous next Node
    });

    it( 'should update the sequence length of the previous event when linking a new event in another measure ' +
        'in the linked event list', () => {
        const pattern1Index = 0;
        const pattern2Index = 2;
        const patternAmount = pattern2Index + 1;
        const channelIndex  = 0;
        const lists         = [ new LinkedList() ]; // we'll operate on a single channel (0)

        for ( let i = 0; i < patternAmount; ++i )
            song.patterns[ i ] = PatternFactory.createEmptyPattern( 16 );

        song.meta.tempo    = 120; // 120 BPM means each measure lasts for 2 seconds

        const event1step = 0; // step 0 is at start offset of 0 seconds
        const event2step = 4; // step 4 is at start offset of .5 second (quarter of a 16 step measure at 120 BPM)
                              // HOWEVER we will add this event at a different pattern index (pattern 2 == the 3rd
                              // pattern, meaning we expect two full measures between event1 and event2 (4 seconds at 120 BPM)

        const event1 = createNoteOnEvent( event1step, song, pattern1Index, channelIndex, lists );
        createNoteOnEvent( event2step, song, pattern2Index, channelIndex, lists );

        expect(4.5).toEqual(event1.seq.length); // expected event 1 sequence length to stretch across several measures

        // insert new event in between

        const event3step = 4; // step 4 is at start offset 0.5 seconds (quarter of a 16 step measure at 120 BPM)
        createNoteOnEvent( event3step, song, pattern1Index, channelIndex, lists );

        expect(.5).toEqual(event1.seq.length); // expected event 1 sequence length to have been updated to match insertion before previous next Node
    });

    it( 'should update the sequence length of the previous event when clearing a event in the linked event list', () => {
        const patternIndex = 0;
        const channelIndex = 0;
        const lists        = [ new LinkedList() ]; // just a single list (we'll test on channel 0)
        song.meta.tempo    = 120; // 120 BPM means each measure lasts for 2 seconds

        const event1step = 0;  // step 0 is at start offset of 0 seconds
        const event2step = 4;  // step 4 is at start offset of .5 second (quarter of a 16 step measure at 120 BPM))
        const event3step = 12; // step 12 is at start offset of 1.5 second (three quarters of a 16 step measure at 120 BPM)

        const event1 = createNoteOnEvent( event1step, song, patternIndex, channelIndex, lists );

        createNoteOnEvent( event2step, song, patternIndex, channelIndex, lists );
        createNoteOnEvent( event3step, song, patternIndex, channelIndex, lists );

        expect(0.5).toEqual(event1.seq.length);

        // remove middle event

        EventUtil.clearEvent( song, patternIndex, channelIndex, event2step, lists[ channelIndex ] );

        expect(1.5).toEqual(event1.seq.length); // expected event 1 sequence length to have updated after removal of its next event
    });

    it( 'should not be able to glide when there are no 2 events defined', () => {
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const lists        = [ new LinkedList() ];

        const event = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        expect(success).toBe(null); // expected glide to have failed as only one event was available
        expect(event.mp).toEqual(undefined); // expected no module parameter change to be set
    });

    it( 'should not be able to glide when there are no 2 events with module parameter changes defined', () => {
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const lists        = [ new LinkedList() ];

        const event1 = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( eventIndex + 5, song, patternIndex, channelIndex, lists );
        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        expect(success).toBe(null); // expected glide to have failed as no module parameter changes were available
        expect(event1.mp).toEqual(undefined); // expected no module parameter change to be set
        expect(event2.mp).toEqual(undefined); // expected no module parameter change to be set
    });

    it( 'should not be able to glide when there are no 2 events with the same module parameter changes defined', () => {
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const event2Index  = eventIndex + 5;
        const lists        = [ new LinkedList() ];

        const event1 = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( event2Index, song, patternIndex, channelIndex, lists );

        event1.mp = {
            module: 'foo',
            value: 0,
            glide: false
        };

        event2.mp = {
            module: 'bar',
            value: 1,
            glide: false
        };

        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        expect(success).toBe(null); // expected glide to have failed as no same module parameter changes were available
    });

    it( 'should be able to glide up when there are 2 events with the same module parameter changes defined', () => {
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const event2Index  = eventIndex + 4;
        const lists        = [ new LinkedList() ];

        const event1 = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( event2Index, song, patternIndex, channelIndex, lists );

        event1.mp = {
            module: 'foo',
            value: 0,
            glide: false
        };

        event2.mp = {
            module: 'foo',
            value: 1,
            glide: false
        };

        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        expect(Array.isArray(success)).toBe(true); // expected glide to have completed as the same module parameter changes were available

        const events = song.patterns[ patternIndex ].channels[ channelIndex ];
        const expectedValues = [ 0, .25, .5, .75, 1 ];
        for ( let i = eventIndex, e = 0; i < event2Index; ++i, ++e ) {
            const event = events[ i ];
            expect(typeof event).toBe('object');
            expect(event.mp.glide).toBe(true); // expected event module parameter change to be set to glide
            expect(expectedValues[ e ].toFixed(2)).toEqual(event.mp.value.toFixed(2));
        }
    });

    it( 'should be able to glide down when there are 2 events with the same module parameter changes defined', () => {
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const event2Index  = eventIndex + 4;
        const lists        = [ new LinkedList() ];

        const event1 = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( event2Index, song, patternIndex, channelIndex, lists );

        event1.mp = {
            module: 'foo',
            value: 0.75,
            glide: false
        };

        event2.mp = {
            module: 'foo',
            value: 0.25,
            glide: false
        };

        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        expect(Array.isArray(success)).toBe(true); // expected glide to have completed as the same module parameter changes were available

        const events = song.patterns[ patternIndex ].channels[ channelIndex ];
        const expectedValues = [ 0.75, 0.625, 0.5, 0.375, 0.25 ];
        for ( let i = eventIndex, e = 0; i < event2Index; ++i, ++e ) {
            const event = events[ i ];
            expect(typeof event).toBe('object');
            expect(event.mp.glide).toBe(true); // expected event module parameter change to be set to glide
            expect(expectedValues[ e ].toFixed(2)).toEqual(event.mp.value.toFixed(2));
        }
    });
});

/* internal methods */

function createNoteOnEvent( step, song, patternIndex, channelIndex, lists ) {
    const event   = EventFactory.createAudioEvent( 0, 'C', 3, 1 );
    const pattern = song.patterns[ patternIndex ];

    pattern.channels[ channelIndex ][ step ] = event;

    EventUtil.setPosition( event, pattern, patternIndex, step, song.meta.tempo );
    EventUtil.linkEvent( event, channelIndex, song, lists );

    return event;
}
