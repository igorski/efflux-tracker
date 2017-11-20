/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai           = require( "chai" );
const EventUtil      = require( "../../src/js/utils/EventUtil" );
const LinkedList     = require( "../../src/js/utils/LinkedList" );
const MockBrowser    = require( "mock-browser" ).mocks.MockBrowser;
const EventFactory   = require( "../../src/js/model/factory/EventFactory" );
const PatternFactory = require( "../../src/js/model/factory/PatternFactory" );
const SongModel      = require( "../../src/js/model/SongModel" );

describe( "EventUtil", () =>
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    // executed before the tests start running

    before( () =>
    {
        const browser = new MockBrowser();
        global.window = browser.getWindow();
    });

    // executed when all tests have finished running

    after( () =>
    {

    });

    // executed before each individual test

    beforeEach( () =>
    {

    });

    // executed after each individual test

    afterEach( () =>
    {

    });

    /* actual unit tests */

    it( "should, when no length is given, calculate the duration as the minimum unit relative to the patterns length", () =>
    {
        const model       = new SongModel();
        const song        = model.createSong();
        const pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const audioEvent = EventFactory.createAudioEvent();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, song.meta.tempo );

        const measureLength  = ( 60 / song.meta.tempo ) * 4;
        let expectedLength = ( 1 / pattern.steps ) * measureLength;

        assert.strictEqual( expectedLength, audioEvent.seq.length,
            "expected event duration to be " + expectedLength + " seconds" );

        // increase pattern size

        pattern.steps  *= 2;
        expectedLength = ( 1 / pattern.steps ) * measureLength;

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, song.meta.tempo );

        assert.strictEqual( expectedLength, audioEvent.seq.length,
            "expected event duration to be " + expectedLength + " seconds" );
    });

    it( "should be able to update the position of a AudioEvent", () =>
    {
        const model       = new SongModel();
        const song        = model.createSong();
        const pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const expectedStartMeasure       = 0;
        const expectedStartMeasureOffset = 1; // half in measure (measure lasts 2s at 120 BPM)
        const expectedEndMeasure         = 0;
        const expectedLength             = .5;

        const audioEvent = EventFactory.createAudioEvent();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 2, song.meta.tempo, expectedLength );

        assert.strictEqual( expectedStartMeasure, audioEvent.seq.startMeasure,
            "expected event to start at measure " + expectedStartMeasure );

        assert.strictEqual( expectedStartMeasureOffset, audioEvent.seq.startMeasureOffset,
            "expected events measure offset to be at offset" + expectedStartMeasureOffset );

        assert.strictEqual( expectedEndMeasure, audioEvent.seq.endMeasure,
            "expected event to end at measure " + expectedEndMeasure );

        assert.strictEqual( expectedLength, audioEvent.seq.length,
            "expected event duration to be " + expectedLength + " seconds" );
    });

    it( "should be able to update the position of an AudioEvent that spans several measures in duration", () =>
    {
        const model       = new SongModel();
        const song        = model.createSong();
        const pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const expectedStartMeasure       = 0;
        const expectedStartMeasureOffset = .5; // a quarter note into measure (measure lasts 2s at 120 BPM)
        const expectedLength             = 4;  // duration is 4 seconds (2 measures at 120 BPM)
        const expectedEndMeasure         = 2;  // events duration exceeds 2 measures (each at 2s at 120 BPM)

        const audioEvent = EventFactory.createAudioEvent();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, song.meta.tempo, expectedLength );

        assert.strictEqual( expectedStartMeasure, audioEvent.seq.startMeasure,
            "expected event to start at measure " + expectedStartMeasure );

        assert.strictEqual( expectedStartMeasureOffset, audioEvent.seq.startMeasureOffset,
            "expected events measure offset to be at offset" + expectedStartMeasureOffset );

        assert.strictEqual( expectedEndMeasure, audioEvent.seq.endMeasure,
            "expected event to end at measure " + expectedEndMeasure );

        assert.strictEqual( expectedLength, audioEvent.seq.length,
            "expected event duration to be " + expectedLength + " seconds" );
    });

    it( "should be able to clear the AudioEvent content for any requested step position", () =>
    {
        const song         = new SongModel().createSong();
        const patternIndex = 0;
        const pattern      = song.patterns[ patternIndex ];

        // generate some note content

        const pchannel1 = pattern.channels[ 0 ];
        const pchannel2 = pattern.channels[ 1 ];

        // create some AudioEvents

        const expected1 = pchannel1[ 0 ] = EventFactory.createAudioEvent( 1, "E", 2, 1 );
        const expected2 = pchannel1[ 1 ] = EventFactory.createAudioEvent( 1, "F", 3, 1 );
        const expected3 = pchannel2[ 0 ] = EventFactory.createAudioEvent( 1, "F#",4, 1 );
        const expected4 = pchannel2[ 1 ] = EventFactory.createAudioEvent( 1, "G", 5, 1 );

        // start clearing individual events and asserting the results

        EventUtil.clearEvent( song, patternIndex, 0, 0 );

        assert.notStrictEqual( expected1, pchannel1[ 0 ]);
        assert.strictEqual( 0, pchannel1[ 0 ]); // event should now be 0

        EventUtil.clearEvent( song, patternIndex, 1, 0 );

        assert.notStrictEqual( expected3, pchannel2[ 0 ]);
        assert.strictEqual( 0, pchannel2[ 0 ]); // event should now be 0

        // assert remaining events are still existent

        assert.strictEqual( expected2, pchannel1[ 1 ]);
        assert.strictEqual( expected4, pchannel2[ 1 ]);
    });

    it( "should be able to remove the AudioEvent from the cached LinkedList when clearing the event", () =>
    {
        const song         = new SongModel().createSong();
        const patternIndex = 0;
        const pattern      = song.patterns[ patternIndex ];

        // generate some note content

        const pchannel1 = pattern.channels[ 0 ];
        const pchannel2 = pattern.channels[ 1 ];

        // create some AudioEvents

        const expected1 = pchannel1[ 0 ] = EventFactory.createAudioEvent( 1, "E", 2, 1 );
        const expected2 = pchannel2[ 1 ] = EventFactory.createAudioEvent( 1, "F", 3, 1 );

        const list = new LinkedList();

        const expected1node = list.add( expected1 );
        const expected2node = list.add( expected2 );

        EventUtil.clearEvent( song, patternIndex, 0, 0, list );
        assert.strictEqual( null, list.getNodeByData( expected1 ),
            "expected Node to have been removed after clearing of event" );

        assert.strictEqual( expected2node, list.getNodeByData( expected2 ),
            "expected other Node to not have been removed after clearing of event" );

        EventUtil.clearEvent( song, patternIndex, 1, 1, list );
        assert.strictEqual( null, list.getNodeByData( expected2 ),
            "expected Node to have been removed after clearing of event" );
    });

    it( "should be able to retrieve the first event before the given event", () =>
    {
        const channelEvents = [];

        const event1 = EventFactory.createAudioEvent();
        const event2 = EventFactory.createAudioEvent();
        const event3 = EventFactory.createAudioEvent();

        channelEvents.push( event1 ); // step 0
        channelEvents.push( null );   // step 1
        channelEvents.push( event2 ); // step 2
        channelEvents.push( event3 ); // step 3

        assert.strictEqual( event2, EventUtil.getFirstEventBeforeStep( channelEvents, 3 ));
        assert.strictEqual( event1, EventUtil.getFirstEventBeforeStep( channelEvents, 2 ));
        assert.strictEqual( event1, EventUtil.getFirstEventBeforeStep( channelEvents, 1 ));
        assert.strictEqual( null,   EventUtil.getFirstEventBeforeStep( channelEvents, 0 ));
    });

    it( "should be able to retrieve the first event before the given event that matches given compare function", () =>
    {
        const channelEvents = [];

        const event1 = EventFactory.createAudioEvent();
        const event2 = EventFactory.createAudioEvent();
        const event3 = EventFactory.createAudioEvent();

        event1.mp = { "foo": "bar" };

        channelEvents.push( event1 ); // step 0
        channelEvents.push( event2 ); // step 1
        channelEvents.push( event3 ); // step 2

        assert.strictEqual( event1, EventUtil.getFirstEventBeforeStep( channelEvents, 2, ( compareEvent ) => {
            return compareEvent.mp && compareEvent.mp.foo === "bar";
        }));
    });

    it( "should update the sequence length of the previous event when linking a new event in the linked event list", () => {

        const song          = new SongModel().createSong();
        const patternIndex  = 0;
        const channelIndex  = 0;
        const lists         = [ new LinkedList() ]; // just a single list (we'll test on channel 0)
        song.meta.tempo     = 120; // 120 BPM means each measure lasts for 2 seconds

        const event1step = 0; // step 0 is at start offset of 0 seconds
        const event2step = 8; // step 8 is at start offset of 1 second (half a 16 step measure at 120 BPM)

        const event1 = createNoteOnEvent( event1step, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( event2step, song, patternIndex, channelIndex, lists );

        assert.strictEqual( 1, event1.seq.length,
            "expected event 1 sequence length to have been updated to match" );

        // insert new event in between

        const event3step = 4; // step 4 is at start offset 0.5 seconds (quarter of a 16 step measure at 120 BPM)
        const event3 = createNoteOnEvent( event3step, song, patternIndex, channelIndex, lists );

        assert.strictEqual( .5, event1.seq.length,
            "expected event 1 sequence length to have been updated to match insertion before previous next Node" );
    });

    it( "should update the sequence length of the previous event when linking a new event in another measure " +
        "in the linked event list", () => {

        const song          = new SongModel().createSong();
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
        const event2 = createNoteOnEvent( event2step, song, pattern2Index, channelIndex, lists );

        assert.strictEqual( 4.5, event1.seq.length,
            "expected event 1 sequence length to stretch across several measures" );

        // insert new event in between

        const event3step = 4; // step 4 is at start offset 0.5 seconds (quarter of a 16 step measure at 120 BPM)
        const event3 = createNoteOnEvent( event3step, song, pattern1Index, channelIndex, lists );

        assert.strictEqual( .5, event1.seq.length,
            "expected event 1 sequence length to have been updated to match insertion before previous next Node" );
    });

    it( "should update the sequence length of the previous event when clearing a event in the linked event list", () => {

        const song         = new SongModel().createSong();
        const patternIndex = 0;
        const channelIndex = 0;
        const lists        = [ new LinkedList() ]; // just a single list (we'll test on channel 0)
        song.meta.tempo    = 120; // 120 BPM means each measure lasts for 2 seconds

        const event1step = 0;  // step 0 is at start offset of 0 seconds
        const event2step = 4;  // step 4 is at start offset of .5 second (quarter of a 16 step measure at 120 BPM))
        const event3step = 12; // step 12 is at start offset of 1.5 second (three quarters of a 16 step measure at 120 BPM)

        const event1 = createNoteOnEvent( event1step, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( event2step, song, patternIndex, channelIndex, lists );
        const event3 = createNoteOnEvent( event3step, song, patternIndex, channelIndex, lists );

        assert.strictEqual( 0.5, event1.seq.length );

        // remove middle event

        EventUtil.clearEvent( song, patternIndex, channelIndex, event2step, lists[ channelIndex ] );

        assert.strictEqual( 1.5, event1.seq.length,
            "expected event 1 sequence length to have updated after removal of its next event" );
    });

    it( "should not be able to glide when there are no 2 events defined", () => {

        const song         = new SongModel().createSong();
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const lists        = [ new LinkedList() ];

        const event = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        assert.notOk( success, "expected glide to have failed as only one event was available" );
        assert.strictEqual( event.mp, undefined, "expected no module parameter change to be set");
    });

    it( "should not be able to glide when there are no 2 events with module parameter changes defined", () => {

        const song         = new SongModel().createSong();
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const lists        = [ new LinkedList() ];

        const event1 = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( eventIndex + 5, song, patternIndex, channelIndex, lists );
        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        assert.notOk( success, "expected glide to have failed as no module parameter changes were available" );
        assert.strictEqual( event1.mp, undefined, "expected no module parameter change to be set");
        assert.strictEqual( event2.mp, undefined, "expected no module parameter change to be set");
    });

    it( "should not be able to glide when there are no 2 events with the same module parameter changes defined", () => {

        const song         = new SongModel().createSong();
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const event2Index  = eventIndex + 5;
        const lists        = [ new LinkedList() ];

        const event1 = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( event2Index, song, patternIndex, channelIndex, lists );

        event1.mp = {
            module: "foo",
            value: 0,
            glide: false
        };

        event2.mp = {
            module: "bar",
            value: 1,
            glide: false
        };

        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        assert.notOk( success, "expected glide to have failed as no same module parameter changes were available" );
    });

    it( "should be able to glide up when there are 2 events with the same module parameter changes defined", () => {

        const song         = new SongModel().createSong();
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const event2Index  = eventIndex + 4;
        const lists        = [ new LinkedList() ];

        const event1 = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( event2Index, song, patternIndex, channelIndex, lists );

        event1.mp = {
            module: "foo",
            value: 0,
            glide: false
        };

        event2.mp = {
            module: "foo",
            value: 1,
            glide: false
        };

        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        assert.ok( success, "expected glide to have completed as the same module parameter changes were available" );

        const events = song.patterns[ patternIndex ].channels[ channelIndex ];
        const expectedValues = [ 0, .25, .5, .75, 1 ];
        for ( let i = eventIndex, e = 0; i < event2Index; ++i, ++e ) {
            const event = events[ i ];
            assert.ok( typeof event === "object" );
            assert.ok( event.mp.glide, "expected event module parameter change to be set to glide" );
            assert.strictEqual( expectedValues[ e ].toFixed(2), event.mp.value.toFixed(2),
                "expected event value to match the expectation"
            )
        }
    });

    it( "should be able to glide down when there are 2 events with the same module parameter changes defined", () => {

        const song         = new SongModel().createSong();
        const patternIndex = 0;
        const channelIndex = 0;
        const eventIndex   = 0;
        const event2Index  = eventIndex + 4;
        const lists        = [ new LinkedList() ];

        const event1 = createNoteOnEvent( eventIndex, song, patternIndex, channelIndex, lists );
        const event2 = createNoteOnEvent( event2Index, song, patternIndex, channelIndex, lists );

        event1.mp = {
            module: "foo",
            value: 0.75,
            glide: false
        };

        event2.mp = {
            module: "foo",
            value: 0.25,
            glide: false
        };

        const success = EventUtil.glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists );

        assert.ok( success, "expected glide to have completed as the same module parameter changes were available" );

        const events = song.patterns[ patternIndex ].channels[ channelIndex ];
        const expectedValues = [ 0.75, 0.625, 0.5, 0.375, 0.25 ];
        for ( let i = eventIndex, e = 0; i < event2Index; ++i, ++e ) {
            const event = events[ i ];
            assert.ok( typeof event === "object" );
            assert.ok( event.mp.glide, "expected event module parameter change to be set to glide" );
            assert.strictEqual( expectedValues[ e ].toFixed(2), event.mp.value.toFixed(2),
                "expected event value to match the expectation"
            )
        }
    });
});

function createNoteOnEvent( step, song, patternIndex, channelIndex, lists ) {

    const event   = EventFactory.createAudioEvent( 0, "C", 3, 1 );
    const pattern = song.patterns[ patternIndex ];

    pattern.channels[ channelIndex ][ step ] = event;

    EventUtil.setPosition( event, pattern, patternIndex, step, song.meta.tempo );
    EventUtil.linkEvent( event, channelIndex, song, lists );

    return event;
}
