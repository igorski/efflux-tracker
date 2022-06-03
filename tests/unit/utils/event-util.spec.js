/**
 * @jest-environment jsdom
 */
import EventUtil          from '@/utils/event-util';
import LinkedList         from '@/utils/linked-list';
import EventFactory       from '@/model/factories/event-factory';
import PatternFactory     from '@/model/factories/pattern-factory';
import SongFactory        from '@/model/factories/song-factory';
import { ACTION_NOTE_ON } from '@/model/types/audio-event-def';

describe( 'EventUtil', () => {
    let song;

    beforeEach(() => {
        song = SongFactory.create(8);
    });

    /* actual unit tests */

    it( 'should, when no length is given, calculate the duration as the minimum unit relative to the patterns length', () => {
        const pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const audioEvent = EventFactory.create();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, song.meta.tempo );

        const measureLength  = ( 60 / song.meta.tempo ) * 4;
        let expectedLength = ( 1 / pattern.steps ) * measureLength;

        expect(expectedLength).toEqual(audioEvent.seq.length);

        // increase pattern size

        pattern.steps  *= 2;
        expectedLength = ( 1 / pattern.steps ) * measureLength;

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, song.meta.tempo );

        expect(audioEvent.seq.length).toEqual(expectedLength);
    });

    it( 'should be able to update the position of a AudioEvent', () => {
        const pattern   = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const expectedStartOffset        = 2;
        const expectedStartMeasure       = 1;
        const expectedStartMeasureOffset = 1; // half in measure (measure lasts 2s at 120 BPM)
        const expectedEndMeasure         = 1;
        const expectedLength             = .5;

        const audioEvent = EventFactory.create();

        EventUtil.setPosition( audioEvent, pattern, 1, pattern.steps / 2, song.meta.tempo, expectedLength );

        expect(audioEvent.seq.startMeasure).toEqual(expectedStartMeasure);
        expect(audioEvent.seq.startOffset).toEqual(expectedStartOffset);
        expect(audioEvent.seq.startMeasureOffset).toEqual(expectedStartMeasureOffset);
        expect(audioEvent.seq.endMeasure).toEqual(expectedEndMeasure);
        expect(audioEvent.seq.length).toEqual(expectedLength);
    });

    it( 'should be able to update the position of an AudioEvent that spans several measures in duration', () => {
        const pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const expectedStartOffset        = 0;
        const expectedStartMeasure       = 0;
        const expectedStartMeasureOffset = .5; // a quarter note into measure (measure lasts 2s at 120 BPM)
        const expectedLength             = 5;  // duration is 5 seconds (2.5 measures at 120 BPM)
        const expectedEndMeasure         = 2;  // events duration exceeds 2 measures (each at 2s at 120 BPM)

        const audioEvent = EventFactory.create();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, song.meta.tempo, expectedLength );

        expect(expectedStartMeasure).toEqual(audioEvent.seq.startMeasure);
        expect(expectedStartOffset).toEqual(audioEvent.seq.startOffset);
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

        const expected1 = pchannel1[ 0 ] = EventFactory.create( 1, 'E', 2, 1 );
        const expected2 = pchannel1[ 1 ] = EventFactory.create( 1, 'F', 3, 1 );
        const expected3 = pchannel2[ 0 ] = EventFactory.create( 1, 'F#',4, 1 );
        const expected4 = pchannel2[ 1 ] = EventFactory.create( 1, 'G', 5, 1 );

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

        const expected1 = pchannel1[ 0 ] = EventFactory.create( 1, 'E', 2, 1 );
        const expected2 = pchannel2[ 1 ] = EventFactory.create( 1, 'F', 3, 1 );

        const list = new LinkedList();

        const expected2node = list.add( expected2 );

        EventUtil.clearEvent( song, patternIndex, 0, 0, list );
        expect(null).toEqual(list.getNodeByData( expected1 ));

        expect(expected2node).toEqual(list.getNodeByData( expected2 ));

        EventUtil.clearEvent( song, patternIndex, 1, 1, list );
        expect(null).toEqual(list.getNodeByData( expected2 ));
    });

    describe('calculating previous and next events for any given event', () => {
        it( 'should be able to retrieve the first event before the given step', () => {
            const channelEvents = [];

            const event1 = EventFactory.create();
            const event2 = EventFactory.create();
            const event3 = EventFactory.create();

            channelEvents.push( event1 ); // step 0
            channelEvents.push( null );   // step 1
            channelEvents.push( event2 ); // step 2
            channelEvents.push( event3 ); // step 3

            expect(event2).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 3 ));
            expect(event1).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 2 ));
            expect(event1).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 1 ));
            expect(null).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 0 ));
        });

        it( 'should be able to retrieve the first event before the given step that matches given compare function', () => {
            const channelEvents = [];

            const event1 = EventFactory.create();
            const event2 = EventFactory.create();
            const event3 = EventFactory.create();

            event1.mp = { 'foo': 'bar' };

            channelEvents.push( event1 ); // step 0
            channelEvents.push( event2 ); // step 1
            channelEvents.push( event3 ); // step 2

            expect(event1).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 2, ( compareEvent ) => {
                return compareEvent.mp && compareEvent.mp.foo === 'bar';
            }));
        });

        it( 'should be able to retrieve the first event before the given event', () => {
            const patterns = [
                { channels: [ new Array(2), new Array(2) ] },
                { channels: [ new Array(2), new Array(2) ] },
                { channels: [ new Array(2), new Array(2) ] }
            ];

            const event1 = EventFactory.create();
            const event2 = EventFactory.create();
            const event3 = EventFactory.create();
            const event4 = EventFactory.create();

            patterns[0].channels[0].push( event1 ); // pattern 1, channel 1, step 0
            patterns[0].channels[0].push( null );   // pattern 1, channel 1, step 1
            patterns[0].channels[0].push( null );   // pattern 1, channel 1, step 2
            patterns[0].channels[0].push( event2 ); // pattern 1, channel 1, step 3
            patterns[1].channels[0].push( event3 ); // pattern 2, channel 1, step 0
            patterns[2].channels[1].push( event4 );

            // expected to find no results for these situations
            expect(EventUtil.getFirstEventBeforeEvent(patterns, 0, 0, event1)).toBeNull(); // first event in channel
            expect(EventUtil.getFirstEventBeforeEvent(patterns, 2, 1, event4)).toBeNull(); // only event in channel

            // test within same pattern
            expect(event1).toEqual(EventUtil.getFirstEventBeforeEvent(patterns, 0, 0, event2));

            // test across patterns
            expect(event2).toEqual(EventUtil.getFirstEventBeforeEvent(patterns, 1, 0, event3));
        });

        it( 'should be able to retrieve the first event before the given event that matches given compare function', () => {
            const patterns = [
                { channels: [ new Array(2) ] },
                { channels: [ new Array(2) ] },
                { channels: [ new Array(2) ] }
            ];

            const event1 = EventFactory.create();
            const event2 = EventFactory.create();
            const event3 = EventFactory.create();

            patterns[0].channels[0].push( event1 ); // pattern 1, channel 1, step 0
            patterns[0].channels[0].push( null );   // pattern 1, channel 1, step 1
            patterns[0].channels[0].push( null );   // pattern 1, channel 1, step 2
            patterns[0].channels[0].push( event2 ); // pattern 1, channel 1, step 3
            patterns[0].channels[0].push( event3 ); // pattern 1, channel 1, step 4

            event1.mp = { 'foo': 'bar' };

            expect(event1).toEqual(EventUtil.getFirstEventBeforeEvent( patterns, 0, 0, event3, ( compareEvent ) => {
                return compareEvent.mp && compareEvent.mp.foo === 'bar';
            }));
        });

        it( 'should be able to retrieve the first event after the given event', () => {
            const patterns = [
                { channels: [ new Array(2), new Array(2) ] },
                { channels: [ new Array(2), new Array(2) ] },
                { channels: [ new Array(2), new Array(2) ] }
            ];

            const event1 = EventFactory.create();
            const event2 = EventFactory.create();
            const event3 = EventFactory.create();
            const event4 = EventFactory.create();

            patterns[0].channels[0].push( event1 ); // pattern 1, channel 1, step 0
            patterns[0].channels[0].push( null );   // pattern 1, channel 1, step 1
            patterns[0].channels[0].push( null );   // pattern 1, channel 1, step 2
            patterns[0].channels[0].push( event2 ); // pattern 1, channel 1, step 3
            patterns[1].channels[0].push( event3 ); // pattern 2, channel 1, step 0
            patterns[2].channels[1].push( event4 );

            // expected to find no results for these situations
            expect(EventUtil.getFirstEventAfterEvent(patterns, 1, 0, event3)).toBeNull(); // last event in channel
            expect(EventUtil.getFirstEventAfterEvent(patterns, 2, 1, event4)).toBeNull(); // only event in channel

            // test within same pattern
            expect(event2).toEqual(EventUtil.getFirstEventAfterEvent(patterns, 0, 0, event1));

            // test across patterns
            expect(event3).toEqual(EventUtil.getFirstEventAfterEvent(patterns, 0, 0, event2));
        });

        it( 'should be able to retrieve the first event after the given event that matches given compare function', () => {
            const patterns = [
                { channels: [ new Array(2) ] },
                { channels: [ new Array(2) ] },
                { channels: [ new Array(2) ] }
            ];

            const event1 = EventFactory.create();
            const event2 = EventFactory.create();
            const event3 = EventFactory.create();

            patterns[0].channels[0].push( event1 ); // pattern 1, channel 1, step 0
            patterns[0].channels[0].push( null );   // pattern 1, channel 1, step 1
            patterns[0].channels[0].push( null );   // pattern 1, channel 1, step 2
            patterns[0].channels[0].push( event2 ); // pattern 1, channel 1, step 3
            patterns[0].channels[0].push( event3 ); // pattern 1, channel 1, step 4

            event3.mp = { 'foo': 'bar' };

            expect(event3).toEqual(EventUtil.getFirstEventAfterEvent( patterns, 0, 0, event1, ( compareEvent ) => {
                return compareEvent.mp && compareEvent.mp.foo === 'bar';
            }));
        });
    });

    describe('event length calculations', () => {
        it( 'should update the sequence length of the previous event when linking a new event in the linked event list', () => {
            const patternIndex  = 0;
            const channelIndex  = 0;
            const lists         = [ new LinkedList() ]; // just a single list (we'll test on channel 0)
            song.meta.tempo     = 120; // 120 BPM means each measure lasts for 2 seconds

            const event1step = 0; // step 0 is at start offset of 0 seconds
            const event2step = 8; // step 8 is at start offset of 1 second (half a 16 step measure at 120 BPM)

            const event1 = createNoteOnEvent( event1step, song, patternIndex, channelIndex, lists );
            createNoteOnEvent( event2step, song, patternIndex, channelIndex, lists );

            expect(event1.seq.length).toEqual(1); // expected event 1 sequence length to have been updated to match

            // insert new event in between

            const event3step = 4; // step 4 is at start offset 0.5 seconds (quarter of a 16 step measure at 120 BPM)
            createNoteOnEvent( event3step, song, patternIndex, channelIndex, lists );

            expect(event1.seq.length).toEqual(.5); // expected event 1 sequence length to have been updated to match insertion before previous next Node
        });

        it( 'should update the sequence length of the previous event when linking a new event in another measure ' +
            'in the linked event list', () => {
            const pattern1Index = 0;
            const pattern2Index = 2;
            const patternAmount = pattern2Index + 1;
            const channelIndex  = 0;
            const lists         = [ new LinkedList() ]; // we'll operate on a single channel (0)

            for ( let i = 0; i < patternAmount; ++i )
                song.patterns[ i ] = PatternFactory.create( 16 );

            song.meta.tempo    = 120; // 120 BPM means each measure lasts for 2 seconds

            const event1step = 0; // step 0 is at start offset of 0 seconds
            const event2step = 4; // step 4 is at start offset of .5 second (quarter of a 16 step measure at 120 BPM)
                                  // HOWEVER we will add this event at a different pattern index (pattern 2 == the 3rd
                                  // pattern, meaning we expect two full measures between event1 and event2 (4 seconds at 120 BPM)
                                  // and that this event starts 4.5 seconds in

            const event1 = createNoteOnEvent( event1step, song, pattern1Index, channelIndex, lists );
            createNoteOnEvent( event2step, song, pattern2Index, channelIndex, lists );

            expect(event1.seq.length).toEqual(4.5); // expected event 1 sequence length to stretch across several measures

            // insert new event in between

            const event3step = 4; // step 4 is at start offset 0.5 seconds (quarter of a 16 step measure at 120 BPM)
            createNoteOnEvent( event3step, song, pattern1Index, channelIndex, lists );

            expect(event1.seq.length).toEqual(.5); // expected event 1 sequence length to have been updated to match insertion before previous next Node
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

            expect(event1.seq.length).toEqual(.5);

            // remove middle event

            EventUtil.clearEvent( song, patternIndex, channelIndex, event2step, lists[ channelIndex ] );

            expect(event1.seq.length).toEqual(1.5); // expected event 1 sequence length to have updated after removal of its next event
        });

        it( 'should update the sequence length of the given event when prepending a new event in the linked event list', () => {
            const patternIndex  = 0;
            const channelIndex  = 0;
            const lists         = [ new LinkedList() ]; // just a single list (we'll test on channel 0)
            song.meta.tempo     = 120; // 120 BPM means each measure lasts for 2 seconds

            const event1step = 0; // step 0 is at start offset of 0 seconds
            const event2step = 8; // step 8 is at start offset of 1 second (half a 16 step measure at 120 BPM)

            createNoteOnEvent( event1step, song, patternIndex, channelIndex, lists );
            createNoteOnEvent( event2step, song, patternIndex, channelIndex, lists );

            const event3step = 4; // step 4 is at start offset 0.5 seconds (quarter of a 16 step measure at 120 BPM)
            const event3     = createNoteOnEvent( event3step, song, patternIndex, channelIndex, lists );

            expect(event3.seq.length).toEqual(.5);
        });

        it( 'should update the sequence length of the given event when prepending a new event in another measure ' +
            'in the linked event list', () => {
            const pattern1Index = 0;
            const pattern2Index = 2;
            const patternAmount = pattern2Index + 1;
            const channelIndex  = 0;
            const lists         = [ new LinkedList() ]; // we'll operate on a single channel (0)

            for ( let i = 0; i < patternAmount; ++i )
                song.patterns[ i ] = PatternFactory.create( 16 );

            song.meta.tempo    = 120; // 120 BPM means each measure lasts for 2 seconds

            const event1step = 0; // step 0 is at start offset of 0 seconds
            const event2step = 4; // step 4 is at start offset of .5 second (quarter of a 16 step measure at 120 BPM)
                                  // HOWEVER we will add this event at a different pattern index (pattern 2 == the 3rd
                                  // pattern, meaning we expect two full measures between event1 and event2 (4 seconds at 120 BPM)
                                  // and that this event starts 4.5 seconds in

            createNoteOnEvent( event1step, song, pattern1Index, channelIndex, lists );
            createNoteOnEvent( event2step, song, pattern2Index, channelIndex, lists );

            const event3step = 2; // step 2 is at start offset 0.25 seconds (eight of a 16 step measure at 120 BPM)
            const event3 = createNoteOnEvent( event3step, song, pattern1Index, channelIndex, lists );

            expect(event3.seq.length).toEqual(4.25);
        });
    });

    describe('module parameter gliding', () => {
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

            expect(success).toBeNull(); // expected glide to have failed as no module parameter changes were available
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
                expect(event.mp.value.toFixed(2)).toEqual(expectedValues[ e ].toFixed(2));
            }
        });
    });
});

/* internal methods */

function createNoteOnEvent( step, song, patternIndex, channelIndex, lists ) {
    const event   = EventFactory.create( channelIndex, 'C', 3, ACTION_NOTE_ON );
    const pattern = song.patterns[ patternIndex ];

    pattern.channels[ channelIndex ][ step ] = event;

    EventUtil.setPosition( event, pattern, patternIndex, step, song.meta.tempo );
    EventUtil.linkEvent( event, channelIndex, song, lists );

    return event;
}
