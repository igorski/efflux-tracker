/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
"use strict";

module.exports = LinkedList;

function LinkedList() {
    this._length = 0;
    this.head    = null;
    this.tail    = null;
}

function Node( list, data ) {
    this._list    = list;
    this.data     = data;
    this.previous = null;
    this.next     = null;
}

Node.prototype.remove = function() {

    if ( this.previous )
        this.previous.next = this.next;

    if ( this.next )
        this.next.previous = this.previous;

    if ( this._list.head === this )
        this._list.head = this.next;

    if ( this._list.tail === this )
        this._list.tail = this.previous;

    --this._list.length;
    this._list = null; // break reference
};

/* public methods */

LinkedList.prototype.add = function( value ) {

    const node = new Node( this, value );

    if ( this._length === 0 ) {
        this.head = node;
        this.tail = node;
    }
    else {
        this.tail.next = node;
        node.previous  = this.tail;
        this.tail      = node;
    }
    ++this._length;

    return node;
};

/**
 * Remove a node from the LinkedList
 *
 * @public
 * @param {Node|number|Object} object either a Node Object (fastest),
 *        numerical index of the Node or a reference to the Nodes data
 */
LinkedList.prototype.remove = function( object ) {

    if ( object instanceof Node ) {

        object.remove();
    }
    else if ( typeof object === "number" ) {

        let currentNode = this.head;

        if ( this._length === 0 || object < 0 || object > this._length )
            return;

        // 2nd use-case: the first node is removed
        if ( object === 0 ) {

            this.head = currentNode.next;

            if ( this.head )
                this.head.previous = null;
            else
                this.tail = currentNode;

        }
        else if ( object === ( this._length - 1 )) {

            this.tail = this.tail.previous;
            this.tail.next = null;
        }
        else {

            let count = 0;
            while ( count < object ) {
                currentNode = currentNode.next;
                ++count;
            }
            const beforeNodeToDelete = currentNode.previous;
            const afterNodeToDelete  = currentNode.next;

            beforeNodeToDelete.next    = afterNodeToDelete;
            afterNodeToDelete.previous = beforeNodeToDelete;
        }
        --this._length;
    }
    else if ( typeof object === "object" ) {

        const currentNode = this.getNodeByData( object );

        if ( currentNode )
            currentNode.remove();
    }
};

LinkedList.prototype.getNodeByData = function( data ) {

    let currentNode = this.head;
    while ( currentNode ) {

        if ( currentNode.data === data )
            return currentNode;

        currentNode = currentNode.next;
    }
    return null;
};

LinkedList.prototype.flush = function() {

    let node;
    while ( node = this.tail )
        node.remove();
};
