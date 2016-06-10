/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai         = require( "chai" );
const EventUtil    = require( "../../src/js/utils/EventUtil" );
const MockBrowser  = require( "mock-browser" ).mocks.MockBrowser;
const EventFactory = require( "../../src/js/factory/EventFactory" );
const SongModel    = require( "../../src/js/model/SongModel" );

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

    it( "should be able to update the position of a AudioEvent that spans several measures in duration", function()
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

    it( "should not validate empty AudioEvents", function()
    {
        const audioEvent = EventFactory.createAudioEvent();
        assert.notOk( EventUtil.isValid( audioEvent ),
            "expected empty AudioEvent not be valid" );
    });

    it( "should not validate AudioEvents with invalid data types", function()
    {
        const audioEvent = EventFactory.createAudioEvent();

        audioEvent.instrument = "foo";

        assert.notOk( EventUtil.isValid( audioEvent ),
            "expected AudioEvent not be valid as instrument was not of numeric type" );

        audioEvent.instrument = 1;
        audioEvent.note       = 2;

        assert.notOk( EventUtil.isValid( audioEvent ),
            "expected AudioEvent not be valid as note was not of string type" );

        audioEvent.note   = "C";
        audioEvent.octave = "bar";

        assert.notOk( EventUtil.isValid( audioEvent ),
            "expected AudioEvent not be valid as octave was not of number type" );
    });

    it( "should not validate AudioEvents with out of range data types", function()
    {
        const audioEvent = EventFactory.createAudioEvent();

        audioEvent.instrument = 0;
        audioEvent.note       = "C";
        audioEvent.octave     = 0;

        assert.notOk( EventUtil.isValid( audioEvent ),
            "expected AudioEvent not be valid as octave was below allowed threshold" );

        audioEvent.octave = 9;

        assert.notOk( EventUtil.isValid( audioEvent ),
            "expected AudioEvent not be valid as octave was above allowed threshold" );
    });

    it( "should validate AudioEvents with correct note data", function()
    {
        const audioEvent = EventFactory.createAudioEvent();

        audioEvent.instrument = 0;
        audioEvent.note       = "C";
        audioEvent.octave     = 3;

        assert.ok( EventUtil.isValid( audioEvent ),
            "expected AudioEvent to contain valid note data" );
    });
});
