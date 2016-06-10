/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai           = require( "chai" );
const SelectionModel = require( "../../src/js/model/SelectionModel" );
const SongModel      = require( "../../src/js/model/SongModel" );
const MockBrowser    = require( "mock-browser" ).mocks.MockBrowser;

describe( "SelectionModel", function()
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    let browser, model;

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
        let min = 0, i;
        const max = 16;

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

        let min = 0;
        const max = 16;

        model.setSelection( min, max );

        assert.strictEqual( 0, model.minSelectedStep,
            "expected model to return '" + 0 + "' for its minimum selection value" );

        const expected = max;

        assert.strictEqual( expected, model.maxSelectedStep,
            "expected model to return '" + expected + "' for its maximum selection value" );
    });

    it( "should add not add the same index twice to its current selection", function()
    {
        const activeChannel = 0, max = 1;

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

        const activeChannel = 0;
        const otherChannel  = 1;
        const max           = 4;

        model.setSelection( 0, max );
        model.equalizeSelection();

        assert.strictEqual( JSON.stringify( model.selectedChannels[ activeChannel ]),
                            JSON.stringify( model.selectedChannels[ otherChannel ] ),
            "expected both channel contents to be equal but they were not" );
    });

    it( "should treat a single step as 1 unit range", function()
    {
        model.setSelectionChannelRange( 0, 1 );
        model.setSelection( 0 );

        assert.strictEqual( 1, model.getSelectionLength(),
            "expected model to return 1 for selection of a single step" );
    });

    it( "should know the full length of its selection", function()
    {
        model.setSelectionChannelRange( 0, 1 );
        const min = 0;
        const max = 16;

        model.setSelection( min, max );

        const expected = ( max - min ) + 1; // 1 as a single step is already a selection

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

    it( "should be able to expand and shrink its selection when starting key selection to the right", function()
    {
        let keyCode         = 39; // right
        const activeChannel = Math.round( Math.random() * 3 ) + 1;
        const activeStep    = 1;

        // test 1. expand
        
        assert.strictEqual( 0, model.firstSelectedChannel,
            "expected no channel to be selected prior to action" );
        assert.strictEqual( 0, model.lastSelectedChannel,
            "expected no channel to be selected prior to action" );

        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === activeChannel && model.lastSelectedChannel === ( activeChannel + 1 ),
            "A expected model to have a 1 channel wide selection range after expanding" );

        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === activeChannel && model.lastSelectedChannel === ( activeChannel + 2 ),
            "B expected model to have a 2 channel wide selection range after expanding" );

        // test 2. shrink
        
        keyCode = 37; // left
        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === activeChannel && model.lastSelectedChannel === ( activeChannel + 1 ),
            "expected model to have a 1 channel wide selection range after shrinking" );
        
        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === activeChannel && model.lastSelectedChannel === activeChannel,
            "expected model to have a 0 channel wide selection range after shrinking (single channel selected)" );
        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === ( activeChannel - 1 ) && model.lastSelectedChannel === activeChannel,
            "expected model to have a 1 channel wide selection range after shrinking (single channel selected)" );
    });

    it( "should be able to expand and shrink its selection when starting key selection to the left", function()
    {
        let keyCode         = 37; // left
        const activeChannel = Math.round( Math.random() * 3 ) + 1;
        const activeStep    = 1;

        // test 1. expand

        assert.strictEqual( 0, model.firstSelectedChannel,
            "expected no channel to be selected prior to action" );
        assert.strictEqual( 0, model.lastSelectedChannel,
            "expected no channel to be selected prior to action" );

        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === ( activeChannel - 1 ) && model.lastSelectedChannel === activeChannel,
            "expected model to have a 1 channel wide selection range after expanding" );

        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === ( activeChannel - 2 ) && model.lastSelectedChannel === activeChannel,
            "expected model to have a 2 channel wide selection range after expanding" );

        // test 2. shrink

        keyCode = 39; // right
        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === ( activeChannel - 1 ) && model.lastSelectedChannel === activeChannel,
            "A expected model to have a 1 channel wide selection range after shrinking" );

        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === activeChannel && model.lastSelectedChannel === activeChannel,
            "expected model to have a 0 channel wide selection range after shrinking (single channel selected)" );
        model.handleHorizontalKeySelectAction( keyCode, activeChannel, activeStep );

        assert.ok( model.firstSelectedChannel === ( activeChannel + 1 ) && model.lastSelectedChannel === activeChannel,
            "expected model to have a 2 channel wide selection range after shrinking (single channel selected)" );
    });
});
