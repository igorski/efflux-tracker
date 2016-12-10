/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai                = require( "chai" );
const SongFactory         = require( "../../src/js/model/factory/SongFactory" );
const SongValidator       = require( "../../src/js/model/validators/SongValidator" );
const SongAssemblyService = require( "../../src/js/services/SongAssemblyService" );

describe( "SongAssemblyService", () =>
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    // executed before the tests start running

    before( () =>
    {

    });

    // executed when all tests have finished running

    after( () =>
    {

    });

    // executed before each individual test

    beforeEach( () =>
    {

    });

    // executed after each individual test

    afterEach( () =>
    {

    });

    /* actual unit tests */

    it( "should be able to disassemble a Song into a Stringified XTK", () =>
    {
        const song = SongFactory.createSong( 8 );
        const xtk  = SongAssemblyService.disassemble( song );

        assert.ok( typeof xtk === "string",
            "expected Song to have been disassembled into a stringified XTK" );
    });

    it( "should be able to assemble a stringified XTK into a valid Song", () =>
    {
        const song  = SongFactory.createSong( 8 );
        const xtk   = SongAssemblyService.disassemble( song );
        const song2 = SongAssemblyService.assemble( xtk );

        assert.ok( SongValidator.isValid( song2 ),
            "expected XTK to have been assembled into a valid Song but it didn't pass validation" );
    });

    it( "should be able to assemble and disassemble a Song without loss of data", () =>
    {
        const song  = SongFactory.createSong( 8 );
        const xtk   = SongAssemblyService.disassemble( song );
        const song2 = SongAssemblyService.assemble( xtk );

        assert.deepEqual( song, song2,
            "expected disassembled XTK to equal the properties of the song it was assembled from" );
    });
});
