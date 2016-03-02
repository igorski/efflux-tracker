/**
 * Created by igorzinken on 26-07-15.
 */
var chai             = require( "chai" );
var MockBrowser      = require( "mock-browser" ).mocks.MockBrowser;
var AssemblerFactory = require( "../../src/js/factories/AssemblerFactory" );
var SongModel        = require( "../../src/js/model/SongModel" );
var Time             = require( "../../src/js/utils/Time" );

describe( "AssemblerFactory", function()
{
    /* setup */

    // use Chai assertion library
    var assert = chai.assert,
        expect = chai.expect;

    var song, model, browser;

    // executed before the tests start running

    before( function()
    {
        browser       = new MockBrowser();
        global.window = browser.getWindow();

        model = new SongModel();
    });

    // executed when all tests have finished running

    after( function()
    {

    });

    // executed before each individual test

    beforeEach( function()
    {
        song = model.createSong();
    });

    // executed after each individual test

    afterEach( function()
    {

    });

    /* actual unit tests */

    it( "should show the author, title and date in the assembly output", function()
    {
        song.meta.title  = "foo";
        song.meta.author = "bar";

        var asm = textToLineArray( AssemblerFactory.assemblify( song ));

        assert.ok( asm[ 1 ].indexOf( song.meta.title ) > -1,
            "expected assembly output to contain song title" );

        assert.ok( asm[ 3 ].indexOf( song.meta.author ) > -1,
            "expected assembly output to contain song title" );

        assert.ok( asm[ 4 ].indexOf( Time.timestampToDate( song.meta.created )) > -1,
            "expected assembly output to contain song title" );
    });

    it( "should have the correct tempo value in the assembly output", function()
    {
        song.meta.tempo = Math.round( Math.random() * 10 ) + 1;

        var asm = textToLineArray( AssemblerFactory.assemblify( song ));

        assert.ok( asm[ 12 ].indexOf( "TEMPODELAY equ " + song.meta.tempo ) > -1,
            "expected assembly output to contain correct tempo value" );
    });
});

/* helper functions */

function textToLineArray( text )
{
    return text.replace( /\r\n|\n\r|\n|\r/g,"\n" ).split( "\n" );
}
