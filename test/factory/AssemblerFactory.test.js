/**
 * Created by igorzinken on 26-07-15.
 */
var chai             = require( "chai" );
var MockBrowser      = require( "mock-browser" ).mocks.MockBrowser;
var AssemblerFactory = require( "../../src/js/factory/AssemblerFactory" );
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
        song.meta.tempo = rand( 1, 10 );

        var asm = textToLineArray( AssemblerFactory.assemblify( song ));

        assert.ok( asm[ 12 ].indexOf( "TEMPODELAY equ " + song.meta.tempo ) > -1,
            "expected assembly output to contain correct tempo value" );
    });

    it( "should translate the hat pattern correctly into the assembly output", function()
    {
        var pattern = song.hats.pattern;

        for ( var i = 0; i < pattern.length; ++i )
            pattern[ i ] = ( Math.random() > .5 ) ? 1 : 0;

        var asm = textToLineArray( AssemblerFactory.assemblify( song ));
        var lineStart = getLineNumForText( asm, "hatPattern" ) + 1;
        var lineEnd   = lineStart + 4; // 4 lines in total (32 steps divided by 8)
        var pIndex    = 0;
        var lookup;

        for ( lineStart; lineStart < lineEnd; ++lineStart, ++pIndex )
        {
            lookup = "    byte %" + pattern.slice( pIndex * 8, ( pIndex * 8 ) + 8 ).join( "" );
            assert.ok( asm[ lineStart ].indexOf( lookup ) > -1,
                "expected line to contain correct hat pattern definition" );
        }
    });

    it( "should translate the hat pattern properties correctly into the assembly output", function()
    {
        var hats = song.hats;

        hats.start  = rand( 0, 255 );
        hats.pitch  = rand( 0, 31 );
        hats.volume = rand( 0, 15 );
        hats.sound  = rand( 1, 15 );

        var asm = textToLineArray( AssemblerFactory.assemblify( song ));

        assert.ok( asm[ getLineNumForText( asm, "HATSTART equ" )].indexOf( hats.start ) > -1,
            "expected hat start offset to have been translated correctly" );

        assert.ok( asm[ getLineNumForText( asm, "HATVOLUME equ" )].indexOf( hats.volume ) > -1,
            "expected hat volume to have been translated correctly" );

        assert.ok( asm[ getLineNumForText( asm, "HATPITCH equ" )].indexOf( hats.pitch ) > -1,
            "expected hat pitch to have been translated correctly" );

        assert.ok( asm[ getLineNumForText( asm, "HATSOUND equ" )].indexOf( hats.sound ) > -1,
            "expected hat sound to have been translated correctly" );
    });
});

/* helper functions */

function rand( min, max )
{
    return Math.round( Math.random() * max ) + min;
}

function textToLineArray( text )
{
    return text.replace( /\r\n|\n\r|\n|\r/g,"\n" ).split( "\n" );
}

function getLineNumForText( textArray, textToFind )
{
    for ( var i = 0, l = textArray.length; i < l; ++i )
    {
        if ( textArray[ i ].indexOf( textToFind ) > -1 )
            return i;
    }
    return -1;
}