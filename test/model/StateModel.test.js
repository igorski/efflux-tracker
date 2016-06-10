/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai       = require( "chai" );
const StateModel = require( "../../src/js/model/StateModel" );

describe( "StateModel", function()
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    let maxStates, model;

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
        maxStates = Math.round( Math.random() * 100 ) + 10;
        model     = new StateModel( maxStates );
    });

    // executed after each individual test

    afterEach( function()
    {

    });

    /* actual unit tests */

    it( "should be able to store no more states than passed to the constructor", function()
    {
        assert.strictEqual( 0, model.getAmountOfStates(),
            "expected 0 states to be stored after model instantiation" );

        let i, state, amountStored;

        for ( i = 0; i < maxStates; ++i )
        {
            state = generateState( i );
            model.store( state );

            amountStored = model.getAmountOfStates();

            assert.strictEqual(( i + 1 ), amountStored,
                "expected amount of stored states to equal the amount of invoked store requests" );
        }

        for ( i = maxStates; i < maxStates * 2; ++i )
        {
            state = generateState( i );
            model.store( state );

            amountStored = model.getAmountOfStates();

            assert.strictEqual( maxStates, model.getAmountOfStates(),
                "expected amount of stored states to equal the amount given in the constructor" );
        }
    });

    it( "should be able to return to the last stored state", function()
    {
        const states = [];
        let state, i;

        // record states

        for ( i = 0; i < maxStates; ++i )
        {
            state = generateState( i );
            states.push( state );

            model.store( state );
        }

        // restore states one by one

        i = maxStates - 1;

        while ( i-- )
        {
            state = model.undo();

            assert.strictEqual( states[ i ], state,
                "expected to have restored the state recorded for the given step position'" + i + "'" );
        }
    });

    it( "should be able to go back and forth in state history", function()
    {
        const states = [];
        let state, i;

        // record states

        for ( i = 0; i < maxStates; ++i )
        {
            state = generateState( i );
            states.push( state );

            model.store( state );
        }

        // restore some states

        let mid = Math.round( maxStates / 2 );

        i = mid;
        while ( i-- )
            state = model.undo();

        // take care when using an even amount of states (mid was calculated using rounding for an integer value)

        if ( maxStates % 2 === 0 )
            ++mid;

        mid -= 1;

        // restore some states by going forwards from last restore point

        for ( i = mid; i < maxStates; ++i )
        {
            state = model.redo();

            assert.strictEqual( states[ i ], state,
                "expected to have restored the state recorded for the given step position '" + i + "'" );
        }
    });
});

/* helper functions */

function generateState( value )
{
    // just some random data Object
    const out = { foo: Math.random() * Date.now() };

    if ( typeof value === "string" || typeof value === "number" )
        out.id = value;

    return out;
}
