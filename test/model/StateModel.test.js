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

    const noop = function() {}, MIN_STATES = 5;
    let amountOfStates, model;

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
        amountOfStates = Math.round( Math.random() * 100 ) + MIN_STATES;
        model = new StateModel( amountOfStates );
    });

    // executed after each individual test

    afterEach( function()
    {

    });

    /* actual unit tests */

    it( "should not store a state that doesn't supply undo/redo functions", () => {

        expect(() => {
            model.store( {} );
        }).to.throw( /cannot store a state without specifying valid undo and redo actions/ );

        expect(() => {
            model.store({ undo: noop, redo: noop });
        }).not.to.throw();
    });

    it( "should not be able to undo an action when no action was stored in its state history", () => {

        assert.notOk( model.undo(), "expected false to have returned as no operation was available in history" );
    });

    it( "should be able to undo an action when an action was stored in its state history", ( done ) => {

        model.store({ undo: () => done(), redo: noop });
        assert.ok( model.undo() );
    });

    it( "should not be able to redo an action when no action was stored in its state history", () => {

        assert.notOk( model.redo(), "expected false to have returned as no operation was available in history" );
    });

    it( "should be able to redo an action", ( done ) => {

        model.store({ undo: noop, redo: () => done() });
        assert.ok( model.undo() );
        assert.ok( model.redo(), "expected redo to have executed as an action had been undone" );
    });

    it( "should know when it can undo an action", () => {
        assert.notOk( model.canUndo(), "expected no undo to be available after construction");
        model.store({ undo: noop, redo: noop });
        assert.ok( model.canUndo(), "expected undo to be available after addition of action" );
        model.undo();
        assert.notOk( model.canUndo(), "expected no undo to be available after having undone all actions" );
    });

    it( "should know when it can redo an action", () => {
        assert.notOk( model.canRedo(), "expected no redo to be available after construction");
        model.store({ undo: noop, redo: noop });
        assert.notOk( model.canRedo(), "expected no redo to be available after addition of action" );
        model.undo();
        assert.ok( model.canRedo(), "expected redo to be available after having undone actions" );
        model.redo();
        assert.notOk( model.canRedo(), "expected no redo to be available after having redone all actions" );
    });

    it( "should know the amount of states it has stored", () => {
        assert.strictEqual( 0, model.amountOfStates(), "expected no states to be present after construction");

        for ( let i = 0; i < MIN_STATES; ++i ) {
            model.store({ undo: noop, redo: noop });
            assert.strictEqual(( i + 1 ), model.amountOfStates(),
                "expected amount of states to increase when storing new states" );
        }

        for ( let i = MIN_STATES - 1; i >= 0; --i ) {
            model.undo();
            assert.strictEqual( i, model.amountOfStates(), "expected amount of states to decrease when performing undo" );
        }

        for ( let i = 0; i < MIN_STATES; ++i ) {
            model.redo();
            assert.strictEqual(( i + 1 ), model.amountOfStates(),
                "expected amount of states to increase when performing redo" );
        }
    });

    it( "should not store more states than it allows", () => {
        for ( let i = 0; i < amountOfStates * 2; ++i ) {
            model.store({ undo: noop, redo: noop });
        }
        assert.strictEqual( amountOfStates, model.amountOfStates(),
            "expected model to not have recorded more states than the defined maximum" );
    });

    it( "should be able to clear its history", () => {

        function shouldntRun() {
            throw new Error( "undo/redo callback should not have fired after clearing the undo history" );
        }
        model.store({ undo: shouldntRun, redo: shouldntRun });
        model.store({ undo: shouldntRun, redo: shouldntRun });

        model.flush();

        assert.notOk( model.canUndo(), "expected no undo to be available after flushing of history" );
        assert.notOk( model.canRedo(), "expected no redo to be available after flushing of history" );
        assert.strictEqual( 0, model.amountOfStates(), "expected no states to be present in history" );
    });
});
