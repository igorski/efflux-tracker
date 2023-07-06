import { describe, it, expect } from "vitest";
import LinkedList from "@/utils/linked-list";

describe( "Linked list", () => {
    it( "should by default be empty upon construction", () => {
        const list = new LinkedList();

        expect( list.head ).toBeNull(); // expected list to not contain a head upon construction
        expect( list.tail ).toBeNull(); // expected list to not contain a tail upon construction
    });

    it( "should be able to add Objects to its internal list", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };

        expect(0).toEqual(list.length); // expected list length to be 0 after construction

        const obj1node = list.add(obj1);

        expect(1).toEqual(list.length); // expected list length to be 1 after addition of an Object
        expect(obj1node).toEqual(list.head); // expected list to have the added Object as its head Node
        expect(obj1node).toEqual(list.tail); // expected list to have the added Object as its tail when the list has a length of 1

        expect(obj1node.previous).toBeNull(); // expected added node to not have a previous node reference
        expect(obj1node.next).toBeNull(); // expected added node to not have a next node reference
    });

    it( "should be able to wrap added Objects into a Node Object", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };

        const obj1node = list.add(obj1);

        expect(obj1).toEqual(obj1node.data); // expected data property of the returned node to equal the added Object
    });

    it( "should be able to add multiple Objects to its internal list", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };

        const obj1node = list.add(obj1);
        const obj2node = list.add(obj2);

        expect(obj1node).toEqual(list.head); // expected list to have the first added Object as its head Node
        expect(obj2node).toEqual(list.tail); // expected list to have the last added Object as its tail
        expect(obj2node).toEqual(obj1node.next); // expected the first nodes next property to reference the 2nd node

        expect(obj1node.previous).toBeNull(); // expected the first node not to reference a previous node
        expect(obj1node).toEqual(obj2node.previous); // expected the second nodes previous property to reference the 1st node
        expect(obj2node.next).toBeNull(); // expected the second node not to reference a next node

        const obj3 = { title: "baz" };
        const obj3node = list.add(obj3);

        expect(obj1node).toEqual(list.head); // expected list to have the first added Object as its head Node
        expect(obj3node).toEqual(list.tail); // expected list to have the last added Object as its tail
        expect(obj3node).toEqual(obj2node.next); // expected the 2nd node to have the last added node as its next property
        expect(obj2node).toEqual(obj3node.previous); // expected the last node to have the second added node as its next property
        expect(3).toEqual(list.length); // expected list length to be 3 after addition of 3 Objects
    });

    it( "should be able to add an Object before an existing one", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };
        const obj3 = { title: "baz" };
        const obj4 = { title: "qux" };

        const obj1node = list.add(obj1); // index 0
        const obj2node = list.add(obj2); // index 1

        const obj3node = list.addBefore(obj2, obj3); // index 1 (obj2node is now index 2 )

        expect(obj3node).toEqual(obj1node.next); // expected added Object to be the next property of the first added Node
        expect(obj3node).toEqual(obj2node.previous); // expected added Object to be the previous property of the second added Node
        expect(obj2node).toEqual(obj3node.next);// expected second added Node to be the next property of the added Node
        expect(obj1node).toEqual(obj3node.previous); // expected first added Node to be the previous property of the added Node

        const obj4node = list.addBefore(obj1, obj4); // index 0 (obj1node is now #1, obj3node #2, obj2node #3)

        expect(obj4node).toEqual(list.head); // expected last added Object to be the new list head Node
        expect(obj1node).toEqual(obj4node.next); // expected first added Object to be the next property of the new head Node
        expect(obj4node).toEqual(obj1node.previous); // expected new head to be the previous property of the first added Object
        expect(obj1node).toEqual(obj4node.next); // expected first added Node to be the next property of the newly added head Node
        expect(null).toEqual(obj4node.previous); // expected newly added head not to have a previous Node
        expect(4).toEqual(list.length); // expected list length to be 4 after addition of 4 Objects
    });

    it( "should be able to add an Object after an existing one", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };
        const obj3 = { title: "baz" };
        const obj4 = { title: "qux" };

        const obj1node = list.add(obj1); // index 0
        const obj2node = list.add(obj2); // index 1

        const obj3node = list.addAfter(obj1, obj3); // index 1 (obj2node is now index 2 )

        expect(obj3node).toEqual(obj1node.next); // expected added Object to be the next property of the first added Node
        expect(obj3node).toEqual(obj2node.previous); // expected added Object to be the previous property of the second added Node
        expect(obj2node).toEqual(obj3node.next); // expected second added Node to be the next property of the added Node
        expect(obj1node).toEqual(obj3node.previous); // expected first added Node to be the previous property of the added Node

        const obj4node = list.addAfter(obj2, obj4); // index 3 (obj1node is now #0, obj3node #1, obj2node #2)

        expect(obj4node).toEqual(list.tail); // expected last added Object to be the new list tail
        expect(obj2node).toEqual(obj4node.previous); // expected second added Object to be the previous property of the new tail
        expect(obj4node).toEqual(obj2node.next); // expected new head to be the next property of the second added Object
        expect(null).toEqual(obj4node.next); // expected newly added tail not to have a next Node
        expect(obj2node).toEqual(obj4node.previous); // expected second added Node to be the previous property of the new tail
        expect(4).toEqual(list.length); // expected list length to be 4 after addition of 4 Objects
    });

    it( "should be able to remove Objects from its internal list", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };
        const obj3 = { title: "baz" };

        const obj1node = list.add(obj1);
        const obj2node = list.add(obj2);
        const obj3node = list.add(obj3);

        list.remove(obj2node);

        expect(obj1node).toEqual(list.head); // expected list to have the first added Object as its head Node
        expect(obj3node).toEqual(list.tail); // expected list to have the last added Object as its tail
        expect(obj1node).toEqual(obj3node.previous); // expected 3rd node to have the 1st added node as its previous property
        expect(obj3node).toEqual(obj1node.next); // expected 1st node to have the 3rd added node as its next property

        list.remove(obj1node);

        expect(obj3node).toEqual(list.head); // expected list to have the last added Object as its head Node
        expect(obj3node).toEqual(list.tail); // expected list to have the last added Object as its tail
        expect(obj3node.previous).toBeNull(); // expected 3rd node to have no previous property after removal of all other nodes
        expect(obj3node.next).toBeNull(); // expected 3rd node to have no next property after removal of all other nodes

        list.remove(obj3node);

        expect(list.head).toBeNull(); // expected list to have no head after removing all its nodes
        expect(list.tail).toBeNull(); // expected list to have no tail after removing all its nodes
    });

    it( "should be able to flush all Objects from its internal list at once", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj2 = { title: "bar" };
        const obj3 = { title: "baz" };

        list.add(obj1);
        list.add(obj2);
        list.add(obj3);

        list.flush();

        expect(list.head).toBeNull(); // expected list to have no head after flushing
        expect(list.tail).toBeNull(); // expected list to have no head after flushing
    });

    it( "should be able to remove Objects by their Node reference", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj1node = list.add(obj1);
        const obj2 = { title: "bar" };
        const obj2node = list.add(obj2);

        list.remove(obj1node);

        expect(obj2node).toEqual(list.head); // expected list to have 2nd Object as head after removal of 1ast Node
        expect(obj2node).toEqual(list.tail); // expected list to have 2nd Object as tail after removal of 1ast Node
    });

    it( "should be able to remove Objects by their list index", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj1node = list.add(obj1);
        const obj2 = { title: "bar" };
        list.add(obj2);

        list.remove(1);

        expect(obj1node).toEqual(list.head); // expected list to have 1st Object as head after removal of 1ast Node by its index
        expect(obj1node).toEqual(list.tail); // expected list to have 1st Object as tail after removal of 1ast Node by its index
    });

    it( "should be able to remove Objects by their content", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj1node = list.add(obj1);
        const obj2 = { title: "bar" };

        list.remove(obj2);

        expect(obj1node).toEqual(list.head); // expected list to have 1st Object as head after removal of 1ast Node by its data
        expect(obj1node).toEqual(list.tail); // expected list to have 1st Object as tail after removal of 1ast Node by its data
    });

    it( "should be able to remove Objects directly from their Node", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj1node = list.add(obj1);
        const obj2 = { title: "bar" };
        const obj2node = list.add(obj2);
        const obj3 = { title: "baz" };
        const obj3node = list.add(obj3);

        obj2node.remove();

        expect(obj1node).toEqual(list.head); // expected list to have 2nd Object as head after removal of 2nd Node
        expect(obj3node).toEqual(list.tail); // expected list to have 3rd Object as tail after removal of 2nd Node
        expect(2).toEqual(list.length); // expected list length to be 2 after removal of 2nd Node

        obj1node.remove();

        expect(obj3node).toEqual(list.head); // expected list to have 3rd Object as head after removal of 1st Node
        expect(obj3node).toEqual(list.tail); // expected list to have 3rd Object as tail after removal of 1st Node
        expect(1).toEqual(list.length); // expected list length to be 1 after removal of 1st Node

        obj3node.remove();

        expect(list.head).toBeNull(); // expected list to have no head after removal of all Nodes
        expect(list.tail).toBeNull(); // expected list to have no tail after removal of all Nodes
        expect(0).toEqual(list.length); // expected list length to be 0 after removal of all Nodes
    });

    it( "should be able to retrieve Node wrappers by their content", () => {
        const list = new LinkedList();
        const obj1 = { title: "foo" };
        const obj1node = list.add(obj1);
        const obj2 = { title: "bar" };
        const obj2node = list.add(obj2);

        let retrievedNode = list.getNodeByData(obj2);

        expect(obj2node).toEqual(retrievedNode); // expected list to have retrieved the last Node by the last Nodes data

        retrievedNode = list.getNodeByData(obj1);

        expect(obj1node).toEqual(retrievedNode); // expected list to have retrieved the first Node by the last Nodes data
    });
});
