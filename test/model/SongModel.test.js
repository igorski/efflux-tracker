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
        model._songs = []; // no fixtures during test
    });

    // executed after each individual test

    afterEach( function()
    {
        global.window.localStorage.clear();
    });

    /* actual unit tests */

    it( "should be able to create songs", function()
    {
        var song = model.createSong();

        assert.ok( typeof song.id === "string",
            "expected created Object to have an identifier property" );

        assert.ok( typeof song.meta === "object",
            "expected created Object to have a meta property Object" );

        assert.ok( typeof song.meta.tempo === "number",
            "expected created Object to have a numerical tempo property" );

        assert.ok( typeof song.hats === "object",
            "expected created Object to have a hats property Object" );

        assert.ok( song.patterns instanceof Array,
            "expected created Object to have a patterns Array" );

        var compare;

        for ( var i = 0; i < 1024; ++i ) {
            compare = model.createSong();

            assert.notStrictEqual( song.id, compare.id,
                "expected songs to have unique identifiers" );
        }
    });

    it( "should be able to save songs in storage", function()
    {
        var song = model.createSong();

        assert.strictEqual( 0, model.getSongs().length,
            "expected no songs in model prior to saving" );

        model.saveSong( song );

        assert.strictEqual( 1, model.getSongs().length,
            "expected 1 song in model after saving" );

        var song2 = model.createSong();
        model.saveSong( song2 );

        assert.strictEqual( 2, model.getSongs().length,
            "expected 2 songs in model after saving" );

        var songs = model.getSongs();

        assert.strictEqual( song,  songs[ 0 ]);
        assert.strictEqual( song2, songs[ 1 ]);
    });

    it( "should update the modified timestamp when saving a song", function( done )
    {
        var song = model.createSong();
        var org  = song.meta.modified;

        assert.strictEqual( song.meta.created, song.meta.modified,
            "expected creation and modified date to be equal for a newly created song" );

        // a slight timeout so the timestamp can update

        setTimeout( function()
        {
            model.saveSong( song );

            assert.ok( song.meta.created === org,
                "expected creation timestamp to have remained unchanged after saving" );

            assert.notOk( song.meta.modified === org,
                "expected modified timestamp to have updated after saving" );

            done();

        }, 2 );
    });

    it( "should be able to delete songs from storage", function()
    {
        var song  = model.createSong();
        var song2 = model.createSong();

        model.saveSong( song );
        model.saveSong( song2 );

        model.deleteSong( song );

        assert.strictEqual( 1, model.getSongs().length,
            "expected ony 1 song in model after deletion of a song" );

        assert.strictEqual( song2, model.getSongs()[ 0 ],
            "expected song that was added last to be still present in model" );

        model.deleteSong( song2 );

        assert.strictEqual( 0, model.getSongs().length,
            "expected no songs to remain in model after deletion of all songs" );
    });

    it( "should be able to retrieve individual songs by their id", function()
    {
        var song  = model.createSong();
        var song2 = model.createSong();

        model.saveSong( song );
        model.saveSong( song2 );

        var retrieved = model.getSongById( song.id );
        assert.strictEqual( song, retrieved,
            "expected to have retrieved song by its id" );

        retrieved = model.getSongById( song2.id );
        assert.strictEqual( song2, retrieved,
            "expected to have retrieved song by its id" );
    });
});
