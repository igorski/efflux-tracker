/**
 * Created by igorzinken on 26-07-15.
 */
var chai        = require( "chai" );
var MockBrowser = require( "mock-browser" ).mocks.MockBrowser;
var SongModel   = require( "../../src/js/model/SongModel" );

describe( "SongModel", function()
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
    });

    // executed when all tests have finished running

    after( function()
    {

    });

    // executed before each individual test

    beforeEach( function()
    {
        model = new SongModel();
    });

    // executed after each individual test

    afterEach( function()
    {
        global.window.localStorage.clear();
    });

    /* actual unit tests */

    it( "should be able to save songs in storage", function()
    {
        var song = {
            id: "foo"
        };

        assert.strictEqual( 0, model.getSongs().length,
            "expected no songs in model prior to saving" );

        model.addSong( song );

        assert.strictEqual( 1, model.getSongs().length,
            "expected 1 song in model after saving" );

        var song2 = {
            id: "bar"
        };

        model.addSong( song2 );

        assert.strictEqual( 2, model.getSongs().length,
            "expected 2 songs in model after saving" );

        var songs = model.getSongs();

        assert.strictEqual( song,  songs[ 0 ]);
        assert.strictEqual( song2, songs[ 1 ]);
    });

    it( "should be able to delete songs from storage", function()
    {
        var song = {
            id: "foo"
        };

        var song2 = {
            id: "bar"
        };

        model.addSong( song );
        model.addSong( song2 );

        model.deleteSong( song );

        assert.strictEqual( 1, model.getSongs().length,
            "expected ony 1 song in model after deletion of a song" );

        assert.strictEqual( song2, model.getSongs()[ 0 ],
            "expected song that was added last to be still present in model" );

        model.deleteSong( song2 );

        assert.strictEqual( 0, model.getSongs().length,
            "expected no songs to remain in model after deletion of all songs" );
    });
});
