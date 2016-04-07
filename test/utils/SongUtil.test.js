/**
 * Created by igorzinken on 26-07-15.
 */
var chai        = require( "chai" );
var MockBrowser = require( "mock-browser" ).mocks.MockBrowser;
var SongModel   = require( "../../src/js/model/SongModel" );
var SongUtil    = require( "../../src/js/utils/SongUtil" );

describe( "SongUtil", function()
{
    /* setup */

    // use Chai assertion library
    var assert = chai.assert,
        expect = chai.expect;

    // executed before the tests start running

    before( function()
    {
        browser       = new MockBrowser();
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
        var model = new SongModel();
        var song  = model.createSong();

        assert.notOk( SongUtil.hasContent( song ),
            "expected song not to have content as no notes were defined in any pattern" );

        // add a note to the first available slot in the firs
        // available channel of the first available pattern

        var firstSlot  = song.patterns[ 0 ].channels[ 0 ][ 0 ];
        firstSlot.note = "C#";

        assert.ok( SongUtil.hasContent( song ),
            "expected song to have content after a note was defined in the first pattern" );
    });
});
