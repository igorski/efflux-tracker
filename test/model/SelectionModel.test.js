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

    it( "should be able to select multiple channels for its selection", function()
    {
        model.setSelectionChannelRange( 0 );

        assert.strictEqual( 1, model.selectedChannels.length,
            "expected SelectionModel to have 1 channel in its selection range" );

        model.setSelectionChannelRange( 0, 3 );

        assert.strictEqual( 4, model.selectedChannels.length,
            "expected SelectionModel to have 4 channels in its selection range" );

        assert.strictEqual( 0, model.firstSelectedChannel,
            "expected first selected channel to have index 0" );

        assert.strictEqual( 3, model.lastSelectedChannel,
            "expected last selected channel to have index 3" );
    });

    it( "should add indices to its current selection", function()
    {
        var min = 0, max = 16, i;

        model.setSelectionChannelRange( 0 ); // select a single channel
        model.setSelection( min, max );

        for ( i = min; i < max; ++i )
        {
            assert.ok( model.selectedChannels[ 0 ].indexOf( i ) > -1,
                "expected SelectionModel to have added index '" + i + "' to the current selection" );
        }
    });

    it( "should know the minimum and maximum indices of its selection", function()
    {
        model.setSelectionChannelRange( 0 ); // select a single channel

        var min = 0;
        var max = 16;

        model.setSelection( min, max );

        assert.strictEqual( 0, model.minSelectedStep,
            "expected model to return '" + 0 + "' for its minimum selection value" );

        var expected = max;

        assert.strictEqual( expected, model.maxSelectedStep,
            "expected model to return '" + expected + "' for its maximum selection value" );
    });

    it( "should add not add the same index twice to its current selection", function()
    {
        var activeChannel = 0, max = 1;

        model.setSelectionChannelRange( activeChannel, max );
        model.setSelection( 0, max );

        assert.strictEqual( 2, model.selectedChannels[ activeChannel ].length,
            "expected selection to have length of 2 after addition" );

        model.setSelection( 0, max );

        assert.strictEqual( 2, model.selectedChannels[ activeChannel ].length,
            "expected selection to remain at length of 2 after addition of same value" );
    });

    it ( "should be able to clear its selection", function()
    {
        model.setSelectionChannelRange( 0, 1 );

        model.setSelection( 0, 1 );
        model.setSelection( 0, 2 );

        model.clearSelection();

        assert.strictEqual( 0, model.selectedChannels.length,
            "expected selection to have cleared" );

        assert.notOk( model.hasSelection(),
            "expected model not to have a selection after clearing" );
    });

    it( "should be able to equalize the selection for all channels", function()
    {
        model.setSelectionChannelRange( 0, 3 );

        var activeChannel = 0;
        var otherChannel  = 1;
        var max           = 4;

        model.setSelection( 0, max );
        model.equalizeSelection();

        assert.strictEqual( JSON.stringify( model.selectedChannels[ activeChannel ]),
                            JSON.stringify( model.selectedChannels[ otherChannel ] ),
            "expected both channel contents to be equal but they were not" );
    });

    it( "should know the full length of its selection", function()
    {
        model.setSelectionChannelRange( 0, 1 );
        var min = 0;
        var max = 16;

        model.setSelection( min, max );

        var expected = max - min;

        assert.strictEqual( expected, model.getSelectionLength(),
            "expected model to return '" + expected + "' for its selection length" );
    });

    it( "should know whether it has a selection", function()
    {
        assert.notOk( model.hasSelection(),
            "expected model not to have a selection by default" );

        model.setSelectionChannelRange( 0, 4 );
        model.setSelection( 0, 16 );

        assert.ok( model.hasSelection(),
            "expected model to have a selection after invocation of setter" );
    });

    it( "should not allow setting the selection step range without specifying the channel range first", function()
    {
        model = new SelectionModel( new SongModel() );

        expect( function()
        {
            model.setSelection( 0, 16 );

        }).to.throw( /cannot set selection range if no selection channel range had been specified/ );
    });
});
