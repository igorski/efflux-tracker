/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai       = require( "chai" );
const LinkedList = require( "../../src/js/utils/LinkedList" );

describe( "LinkedList", function()
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    // executed before the tests start running

    before( function()
    {

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

    it( "should by default be empty upon construction", function()
    {
        const list = new LinkedList();

        assert.strictEqual( null, list.head,
            "expected list to not contain a head upon construction" );

        assert.strictEqual( null, list.tail,
            "expected list to not contain a tail upon construction" );
    });

    it( "should be able to add Objects to its internal list", function()
    {
        const list = new LinkedList();
        const obj1 = { title: "foo" };

        const obj1node = list.add( obj1 );

        assert.strictEqual( obj1node, list.head,
            "expected list to have the added Object as its head Node" );

        assert.strictEqual( obj1node, list.tail,
            "expected list to have the added Object as its tail when the list has a length of 1" );

        assert.ok( obj1node.previous === null,
            "expected added node to not have a previous node reference" );

        assert.ok( obj1node.next === null,
            "expected added node to not have a next node reference" );
    });

    it( "should be able wrap added Objects into a Node Object", function()
    {
        const list = new LinkedList();
        const obj1 = { title: "foo" };

        const obj1node = list.add( obj1 );

        assert.strictEqual( obj1, obj1node.data,
            "expected data property of the returned node to equal the added Object" );
    });

    it( "should be able to add multiple Objects to its internal list", function()
    {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };

        const obj1node = list.add( obj1 );
        const obj2node = list.add( obj2 );

        assert.strictEqual( obj1node, list.head,
            "expected list to have the first added Object as its head Node" );

        assert.strictEqual( obj2node, list.tail,
            "expected list to have the last added Object as its tail" );

        assert.strictEqual( obj2node, obj1node.next,
            "expected the first nodes next property to reference the 2nd node" );

        assert.ok( obj1node.previous === null,
            "expected the first node not to reference a previous node" );

        assert.strictEqual( obj1node, obj2node.previous,
            "expected the second nodes previous property to reference the 1st node" );

        assert.ok( obj2node.next === null,
            "expected the second node not to reference a next node" );

        const obj3     = { title: "baz" };
        const obj3node = list.add( obj3 );

        assert.strictEqual( obj1node, list.head,
            "expected list to have the first added Object as its head Node" );

        assert.strictEqual( obj3node, list.tail,
            "expected list to have the last added Object as its tail" );

        assert.strictEqual( obj3node, obj2node.next,
            "expect the 2nd node to have the last added node as its next property" );

        assert.strictEqual( obj2node, obj3node.previous,
            "expect the last node to have the second added node as its next property" );
    });

    it( "should be able to add an Object before an existing one", function()
    {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };
        const obj3 = { title: "baz" };
        const obj4 = { title: "qux" };

        const obj1node = list.add( obj1 ); // index 0
        const obj2node = list.add( obj2 ); // index 1

        const obj3node = list.addBefore( obj2, obj3 ); // index 1 (obj2node is now index 2 )

        assert.strictEqual( obj3node, obj1node.next,
            "expected added Object to be the next property of the first added Node" );

        assert.strictEqual( obj3node, obj2node.previous,
            "expected added Object to be the previous property of the second added Node" );

        assert.strictEqual( obj2node, obj3node.next,
            "expected second added Node to be the next property of the added Node" );

        assert.strictEqual( obj1node, obj3node.previous,
            "expected first added Node to be the previous property of the added Node" );

        const obj4node = list.addBefore( obj1, obj4 ); // index 0 (obj1node is now #1, obj3node #2, obj2node #3)

        assert.strictEqual( obj4node, list.head,
            "expected last added Object to be the new list head Node" );

        assert.strictEqual( obj1node, obj4node.next,
            "expected first added Object to be the next property of the new head Node" );

        assert.strictEqual( obj4node, obj1node.previous,
            "expected new head to be the previous property of the first added Object" );

        assert.strictEqual( obj1node, obj4node.next,
            "expected first added Node to be the next property of the newly added head Node" );

        assert.strictEqual( null, obj4node.previous,
            "expected newly added head not to have a previous Node" );
    });

    it( "should be able to add an Object after an existing one", function()
    {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };
        const obj3 = { title: "baz" };
        const obj4 = { title: "qux" };

        const obj1node = list.add( obj1 ); // index 0
        const obj2node = list.add( obj2 ); // index 1

        const obj3node = list.addAfter( obj1, obj3 ); // index 1 (obj2node is now index 2 )

        assert.strictEqual( obj3node, obj1node.next,
            "expected added Object to be the next property of the first added Node" );

        assert.strictEqual( obj3node, obj2node.previous,
            "expected added Object to be the previous property of the second added Node" );

        assert.strictEqual( obj2node, obj3node.next,
            "expected second added Node to be the next property of the added Node" );

        assert.strictEqual( obj1node, obj3node.previous,
            "expected first added Node to be the previous property of the added Node" );

        const obj4node = list.addAfter( obj2, obj4 ); // index 3 (obj1node is now #0, obj3node #1, obj2node #2)

        assert.strictEqual( obj4node, list.tail,
            "expected last added Object to be the new list tail" );

        assert.strictEqual( obj2node, obj4node.previous,
            "expected second added Object to be the previous property of the new tail" );

        assert.strictEqual( obj4node, obj2node.next,
            "expected new head to be the next property of the second added Object" );

        assert.strictEqual( null, obj4node.next,
            "expected newly added tail not to have a next Node" );

        assert.strictEqual( obj2node, obj4node.previous,
            "expected second added Node to be the previous property of the new tail" );
    });

    it( "should be able to remove Objects from its internal list", function()
    {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };
        const obj3 = { title: "baz" };

        const obj1node = list.add( obj1 );
        const obj2node = list.add( obj2 );
        const obj3node = list.add( obj3 );

        list.remove( obj2node );

        assert.strictEqual( obj1node, list.head,
            "expected list to have the first added Object as its head Node" );

        assert.strictEqual( obj3node, list.tail,
            "expected list to have the last added Object as its tail" );

        assert.strictEqual( obj1node, obj3node.previous,
            "expected 3rd node to have the 1st added node as its previous property" );

        assert.strictEqual( obj3node, obj1node.next,
            "expected 1st node to have the 3rd added node as its next property" );

        list.remove( obj1node );

        assert.strictEqual( obj3node, list.head,
            "expected list to have the last added Object as its head Node" );

        assert.strictEqual( obj3node, list.tail,
            "expected list to have the last added Object as its tail" );

        assert.ok( obj3node.previous === null,
            "expected 3rd node to have no previous property after removal of all other nodes" );

        assert.ok( obj3node.next === null,
            "expected 3rd node to have no next property after removal of all other nodes" );

        list.remove( obj3node );

        assert.ok( list.head === null,
            "expected list to have no head after removing all its nodes" );

        assert.ok( list.tail === null,
            "expected list to have no tail after removing all its nodes" );
    });

    it( "should be able to flush all Objects from its internal list at once", function()
    {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };
        const obj3 = { title: "baz" };

        list.add( obj1 );
        list.add( obj2 );
        list.add( obj3 );

        list.flush();

        assert.ok( list.head === null,
            "expected list to have no head after flushing" );

        assert.ok( list.tail === null,
            "expected list to have no head after flushing" );
    });

    it( "should be able to remove Objects by their Node reference", function()
    {
        const list     = new LinkedList();
        const obj1     = { title: "foo" };
        const obj1node = list.add( obj1 );
        const obj2     = { title: "bar" };
        const obj2node = list.add( obj2 );

        list.remove( obj1node );

        assert.strictEqual( obj2node, list.head,
            "expected list to have 2nd Object as head after removal of 1ast Node" );

        assert.strictEqual( obj2node, list.tail,
            "expected list to have 2nd Object as tail after removal of 1ast Node" );
    });

    it( "should be able to remove Objects by their list index", function()
    {
        const list     = new LinkedList();
        const obj1     = { title: "foo" };
        const obj1node = list.add( obj1 );
        const obj2     = { title: "bar" };
        const obj2node = list.add( obj2 );

        list.remove( 1 );

        assert.strictEqual( obj1node, list.head,
            "expected list to have 1st Object as head after removal of 1ast Node by its index" );

        assert.strictEqual( obj1node, list.tail,
            "expected list to have 1st Object as tail after removal of 1ast Node by its index" );
    });

    it( "should be able to remove Objects by their content", function()
    {
        const list     = new LinkedList();
        const obj1     = { title: "foo" };
        const obj1node = list.add( obj1 );
        const obj2     = { title: "bar" };
        const obj2node = list.add( obj2 );

        list.remove( obj2 );

        assert.strictEqual( obj1node, list.head,
            "expected list to have 1st Object as head after removal of 1ast Node by its data" );

        assert.strictEqual( obj1node, list.tail,
            "expected list to have 1st Object as tail after removal of 1ast Node by its data" );
    });

    it( "should be able to remove Objects directly from their Node", function()
    {
        const list     = new LinkedList();
        const obj1     = { title: "foo" };
        const obj1node = list.add( obj1 );
        const obj2     = { title: "bar" };
        const obj2node = list.add( obj2 );
        const obj3     = { title: "baz" };
        const obj3node = list.add( obj3 );

        obj2node.remove();

        assert.strictEqual( obj1node, list.head,
            "expected list to have 2nd Object as head after removal of 2nd Node" );

        assert.strictEqual( obj3node, list.tail,
            "expected list to have 3rd Object as tail after removal of 2nd Node" );

        assert.strictEqual( 2, list._length,
            "expected list length to be 2 after removal of 2nd Node" );

        obj1node.remove();

        assert.strictEqual( obj3node, list.head,
            "expected list to have 3rd Object as head after removal of 1st Node" );

        assert.strictEqual( obj3node, list.tail,
            "expected list to have 3rd Object as tail after removal of 1st Node" );

        assert.strictEqual( 1, list._length,
                    "expected list length to be 1 after removal of 1st Node" );

        obj3node.remove();

        assert.ok( list.head === null,
            "expected list to have no head after removal of all Nodes" );

        assert.ok( list.tail === null,
            "expected list to have no tail after removal of all Nodes" );

        assert.strictEqual( 0, list._length,
            "expected list length to be 0 after removal of all Nodes" );
    });

    it( "should be able to retrieve Node wrappers by their content", function()
    {
        const list     = new LinkedList();
        const obj1     = { title: "foo" };
        const obj1node = list.add( obj1 );
        const obj2     = { title: "bar" };
        const obj2node = list.add( obj2 );

        let retrievedNode = list.getNodeByData( obj2 );

        assert.strictEqual( obj2node, retrievedNode,
            "expected list to have retrieved the last Node by the last Nodes data" );

        retrievedNode = list.getNodeByData( obj1 );

        assert.strictEqual( obj1node, retrievedNode,
            "expected list to have retrieved the first Node by the last Nodes data" );
    });
});
