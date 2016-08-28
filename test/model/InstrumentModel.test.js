/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai                = require( "chai" );
const MockBrowser         = require( "mock-browser" ).mocks.MockBrowser;
const InstrumentModel     = require( "../../src/js/model/InstrumentModel" );
const InstrumentValidator = require( "../../src/js/model/validators/InstrumentValidator" );
const InstrumentFactory   = require( "../../src/js/model/factory/InstrumentFactory" );

describe( "InstrumentModel", () =>
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    let browser, model;

    // executed before the tests start running

    before( () =>
    {
        browser       = new MockBrowser();
        global.window = browser.getWindow();
    });

    // executed when all tests have finished running

    after( () =>
    {

    });

    // executed before each individual test

    beforeEach( () =>
    {
        model = new InstrumentModel();
        model._instruments = []; // no fixtures during test
    });

    // executed after each individual test

    afterEach( () =>
    {
        global.window.localStorage.clear();
    });

    /* actual unit tests */
    
    it( "should not save instruments without a valid preset name", () => {

        const instrument = InstrumentFactory.createInstrument( 0 );

        assert.strictEqual( 0, model.getInstruments().length,
            "expected no instruments in model prior to saving" );

        assert.notOk( model.saveInstrument( instrument ),
            "expected instrument without preset name not to have been saved" );

        assert.strictEqual( 0, model.getInstruments().length,
            "expected 0 instruments in model after unsuccessful save" );
    });

    it( "should be able to save instruments in storage", () => {

        const instrument1 = InstrumentFactory.createInstrument( 0 );
        instrument1.presetName = "foo";

        assert.strictEqual( 0, model.getInstruments().length,
            "expected no instruments in model prior to saving" );

        assert.ok( model.saveInstrument( instrument1 ),
            "expected instrument with preset name to have been saved" );

        assert.strictEqual( 1, model.getInstruments().length,
            "expected 1 instruments in model after saving" );

        const instrument2 = InstrumentFactory.createInstrument( 1 );
        instrument2.presetName = "bar";

        assert.ok( model.saveInstrument( instrument2 ),
            "expected instrument with preset name to have been saved" );

        assert.strictEqual( 2, model.getInstruments().length,
            "expected 2 instruments in model after saving" );

        const instruments = model.getInstruments();

        assert.strictEqual( instrument1,  instruments[ 0 ]);
        assert.strictEqual( instrument2, instruments[ 1 ]);
    });

    it( "should be able to delete instruments from storage", () => {

        const instrument1 = InstrumentFactory.createInstrument( 0 );
        const instrument2 = InstrumentFactory.createInstrument( 1 );

        instrument1.presetName = "foo";
        instrument2.presetName = "bar";

        model.saveInstrument( instrument1 );
        model.saveInstrument( instrument2 );

        model.deleteInstrument( instrument1 );

        assert.strictEqual( 1, model.getInstruments().length,
            "expected ony 1 instrument in model after deletion of a song" );

        assert.strictEqual( instrument2, model.getInstruments()[ 0 ],
            "expected instrument that was added last to be still present in model" );

        model.deleteInstrument( instrument2 );

        assert.strictEqual( 0, model.getInstruments().length,
            "expected no instruments to remain in model after deletion of all instruments" );
    });

    it( "should be able to retrieve individual instruments by their preset name", () => {

        const instrument1 = InstrumentFactory.createInstrument( 0 );
        const instrument2 = InstrumentFactory.createInstrument( 1 );

        instrument1.presetName = "foo";
        instrument2.presetName = "bar";

        model.saveInstrument( instrument1 );
        model.saveInstrument( instrument2 );

        let retrieved = model.getInstrumentByPresetName( instrument1.presetName );
        assert.strictEqual( instrument1, retrieved,
            "expected to have retrieved instrument by its preset name" );

        retrieved = model.getInstrumentByPresetName( instrument2.presetName );
        assert.strictEqual( instrument2, retrieved,
            "expected to have retrieved instrument by its preset name" );
    });
});
