/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai           = require( "chai" );
const MockBrowser    = require( "mock-browser" ).mocks.MockBrowser;
const SongModel      = require( "../../src/js/model/SongModel" );
const EventFactory   = require( "../../src/js/factory/EventFactory" );
const PatternFactory = require( "../../src/js/factory/PatternFactory" );
const SongUtil       = require( "../../src/js/utils/SongUtil" );

describe( "SongUtil", function()
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

    it( "should know whether or not a song has content", function()
    {
        const model = new SongModel();
        const song  = model.createSong();

        assert.notOk( SongUtil.hasContent( song ),
            "expected song not to have content as no events with an action were defined in any pattern" );

        // add a note to the first available slot in the firs
        // available channel of the first available pattern

        const firstEvent    = EventFactory.createAudioEvent();
        firstEvent.action = 1;
        song.patterns[ 0 ].channels[ 0 ][ 0 ] = firstEvent;

        assert.ok( SongUtil.hasContent( song ),
            "expected song to have content after a event action was defined in the first pattern" );
    });

    it( "should be able to update existing Audio Event offsets recursively", function()
    {
        const model = new SongModel();
        const song  = model.createSong();

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

        assert.strictEqual( expectedOffset1, firstEvent.seq.startMeasureOffset,
            "expect event startMeasureOffset to have updated" );

        assert.strictEqual( expectedLength1, firstEvent.seq.length,
            "expect event length to have updated" );

        assert.strictEqual( expectedOffset2, secondEvent.seq.startMeasureOffset,
            "expect event startMeasureOffset to have updated" );

        assert.strictEqual( expectedLength2, secondEvent.seq.length,
            "expect event length to have updated" );
    });
});
