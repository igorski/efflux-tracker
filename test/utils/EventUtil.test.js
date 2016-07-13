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

describe( "EventUtil", function()
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    // executed before the tests start running

    before( function()
    {
        const browser = new MockBrowser();
        global.window = browser.getWindow();
    });

    // executed when all tests have finished running

    after( function()
    {

    });

    // executed before each individual test

    beforeEach( function()
    {

    });

    // executed after each individual test

    afterEach( function()
    {

    });

    /* actual unit tests */

    it( "should, when no length is given, calculate the duration as the minimum unit relative to the patterns length", function()
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

    it( "should be able to update the position of a AudioEvent", function()
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

    it( "should be able to update the position of an AudioEvent that spans several measures in duration", function()
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

    it( "should be able to clear the AudioEvent content for any requested step position", function()
    {
        const pattern = PatternFactory.createEmptyPattern();

        // generate some note content

        const pchannel1 = pattern.channels[ 0 ];
        const pchannel2 = pattern.channels[ 1 ];

        // create some AudioEvents

        const expected1 = pchannel1[ 0 ] = EventFactory.createAudioEvent( 1, "E", 2, 1 );
        const expected2 = pchannel1[ 1 ] = EventFactory.createAudioEvent( 1, "F", 3, 1 );
        const expected3 = pchannel2[ 0 ] = EventFactory.createAudioEvent( 1, "F#",4, 1 );
        const expected4 = pchannel2[ 1 ] = EventFactory.createAudioEvent( 1, "G", 5, 1 );

        // start clearing individual events and asserting the results

        EventUtil.clearEvent( pattern, 0, 0 );

        assert.notStrictEqual( expected1, pchannel1[ 0 ]);

        EventUtil.clearEvent( pattern, 1, 0 );

        assert.notStrictEqual( expected3, pchannel2[ 0 ]);

        // assert remaining events are still existent

        assert.strictEqual( expected2, pchannel1[ 1 ]);
        assert.strictEqual( expected4, pchannel2[ 1 ]);
    });

    it( "should be able to remove the AudioEvent from the cached LinkedList when clearing the event", function()
    {
        const pattern = PatternFactory.createEmptyPattern();

        // generate some note content

        const pchannel1 = pattern.channels[ 0 ];
        const pchannel2 = pattern.channels[ 1 ];

        // create some AudioEvents

        const expected1 = pchannel1[ 0 ] = EventFactory.createAudioEvent( 1, "E", 2, 1 );
        const expected2 = pchannel2[ 1 ] = EventFactory.createAudioEvent( 1, "F", 3, 1 );

        const list = new LinkedList();

        const expected1node = list.add( expected1 );
        const expected2node = list.add( expected2 );

        EventUtil.clearEvent( pattern, 0, 0, list );
        assert.strictEqual( null, list.getNodeByData( expected1 ),
            "expected Node to have been removed after clearing of event" );

        assert.strictEqual( expected2node, list.getNodeByData( expected2 ),
            "expected other Node to not have been removed after clearing of event" );

        EventUtil.clearEvent( pattern, 1, 1, list );
        assert.strictEqual( null, list.getNodeByData( expected2 ),
            "expected Node to have been removed after clearing of event" );
    });

    it( "should be able to retrieve the first event before the given event", function()
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
});
