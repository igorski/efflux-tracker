/**
 * Created by igorzinken on 26-07-15.
 */
var chai           = require( "chai" );
var SelectionModel = require( "../../src/js/model/SelectionModel" );
var SongModel      = require( "../../src/js/model/SongModel" );
var MockBrowser    = require( "mock-browser" ).mocks.MockBrowser;

describe( "SelectionModel", function()
{
    /* setup */

    // use Chai assertion library
    var assert = chai.assert,
        expect = chai.expect;

    var browser, model;

    // executed before the tests start running

    before( function()
    {
        browser       = new MockBrowser();
        global.window = browser.getWindow();

        model = new SelectionModel( new SongModel() );
    });

    // executed when all tests have finished running

    after( function()
    {

    });

    // executed before each individual test

    beforeEach( function()
    {
        model.clearSelection();
    });

    // executed after each individual test

    afterEach( function()
    {

    });

    /* actual unit tests */

    it( "should add indices to its current selection", function()
    {
        var activeChannel = 0, max = 16;
        model.setSelection( activeChannel, 0, max );

        for ( var i = 0; i < max; ++i )
        {
            assert.ok( model.selection[ activeChannel ].indexOf( i ) > -1,
                "expected SelectionModel to have added index '" + i + "' to the current selection" );
        }
    });

    it( "should add not add the same index twice to its current selection", function()
    {
        var activeChannel = 0, max = 1;

        assert.strictEqual( 0, model.selection[ activeChannel ].length,
            "expected selection to have 0 length prior to addition" );

        model.setSelection( activeChannel, 0, max );

        assert.strictEqual( 1, model.selection[ activeChannel ].length,
            "expected selection to have length of 1 after addition" );

        model.setSelection( activeChannel, 0, max );

        assert.strictEqual( 1, model.selection[ activeChannel ].length,
            "expected selection to remain at length of 1 after addition of same value" );
    });

    it ( "should be able to clear its selection", function()
    {
        model.setSelection( 0, 0, 1 );
        model.setSelection( 1, 0, 2 );

        model.clearSelection();

        assert.strictEqual( 0, model.selection[ 0 ].length,
            "expected selection to have cleared" );

        assert.strictEqual( 0, model.selection[ 1 ].length,
            "expected selection to have cleared" );

        assert.notOk( model.hasSelection(),
            "expected model not to have a selection after clearing" );
    });

    it( "should equalize the selection for both channels when forced", function()
    {
        var activeChannel = 0;
        var otherChannel  = 1;
        var max           = 4;

        model.setSelection( activeChannel, 0, max );

        model.equalizeSelection( activeChannel, true );

        assert.strictEqual( JSON.stringify( model.selection[ activeChannel ]),
                            JSON.stringify( model.selection[ otherChannel ] ),
            "expected both channel contents to be equal but they were not" );
    });

    it( "should equalize the selection for both channels if both channels had content", function()
    {
        var activeChannel = 0;
        var otherChannel  = 1;

        model.setSelection( activeChannel, 0, 4 );
        model.setSelection( otherChannel,  0, 8 );

        assert.strictEqual( JSON.stringify( model.selection[ activeChannel ]),
                            JSON.stringify( model.selection[ otherChannel ] ),
            "expected both channel contents to be equal but they were not" );
    });

    it( "should know the minimum, maximum values of its selection", function()
    {
        var min = 0;
        var max = 16;

        model.setSelection( 1, min, max );

        assert.strictEqual( 0, model.getMinValue(),
            "expected model to return '" + 0 + "' for its minimum selection value" );

        var expected = max - 1;

        assert.strictEqual( expected, model.getMaxValue(),
            "expected model to return '" + expected + "' for its maximum selection value" );
    });

    it( "should know the full length of its selection", function()
    {
        var min = 0;
        var max = 16;

        model.setSelection( 0, min, max );

        var expected = max - min;

        assert.strictEqual( expected, model.getSelectionLength(),
            "expected model to return '" + expected + "' for its selection length" );
    });

    it( "should know whether it has a selection", function()
    {
        assert.notOk( model.hasSelection(),
            "expected model not to have a selection by default" );

        model.setSelection( 0, 0, 16 );

        assert.ok( model.hasSelection(),
            "expected model to have a selection after invocation of setter" );
    });
});
