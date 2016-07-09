/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai           = require( "chai" );
const Config         = require( "../../../src/js/config/Config" );
const EventFactory   = require( "../../../src/js/model/factory/EventFactory" );
const EventValidator = require( "../../../src/js/model/validators/EventValidator" );

describe( "EventFactory", function()
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

    it( "should be able to generate a valid Event Object", function()
    {
        const event = EventFactory.createAudioEvent();

        assert.ok( EventValidator.isValid( event ),
            "expected EventFactory to have generated a valid Event Object but it didn't pass validation" );
    });

    it( "should be able to apply a valid module parameter automation Object to an event", function()
    {
        const event = EventFactory.createAudioEvent();
        event.mp    = EventFactory.createModuleParam( "foo", 10, true );

        assert.ok( EventValidator.isValid( event ),
            "expected EventFactory to have generated a valid Event Object but it didn't pass validation" );
    });
});
