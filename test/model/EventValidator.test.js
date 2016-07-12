/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai = require( "chai" );

const EventFactory   = require( "../../src/js/model/factory/EventFactory" );
const EventValidator = require( "../../src/js/model/validators/EventValidator" );

describe( "EventValidator", function()
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    // executed before the tests start running

    before( function()
    {

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

    it( "should not validate empty AudioEvents", function()
    {
        const audioEvent = EventFactory.createAudioEvent();
        assert.notOk( EventValidator.hasContent( audioEvent ),
            "expected empty AudioEvent not be valid" );
    });

    it( "should not validate AudioEvents with invalid data types", function()
    {
        const audioEvent = EventFactory.createAudioEvent();

        audioEvent.instrument = "foo";

        assert.notOk( EventValidator.hasContent( audioEvent ),
            "expected AudioEvent not be valid as instrument was not of numeric type" );

        audioEvent.instrument = 1;
        audioEvent.note       = 2;

        assert.notOk( EventValidator.hasContent( audioEvent ),
            "expected AudioEvent not be valid as note was not of string type" );

        audioEvent.note   = "C";
        audioEvent.octave = "bar";

        assert.notOk( EventValidator.hasContent( audioEvent ),
            "expected AudioEvent not be valid as octave was not of number type" );
    });

    it( "should not validate AudioEvents with out of range data types", function()
    {
        const audioEvent = EventFactory.createAudioEvent();

        audioEvent.instrument = 0;
        audioEvent.note       = "C";
        audioEvent.octave     = 0;

        assert.notOk( EventValidator.hasContent( audioEvent ),
            "expected AudioEvent not be valid as octave was below allowed threshold" );

        audioEvent.octave = 9;

        assert.notOk( EventValidator.hasContent( audioEvent ),
            "expected AudioEvent not be valid as octave was above allowed threshold" );
    });

    it( "should validate AudioEvents with correct note data", function()
    {
        const audioEvent = EventFactory.createAudioEvent();

        audioEvent.instrument = 0;
        audioEvent.note       = "C";
        audioEvent.octave     = 3;

        assert.ok( EventValidator.hasContent( audioEvent ),
            "expected AudioEvent to contain valid note data" );
    })
});
