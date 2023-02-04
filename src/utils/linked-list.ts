/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
export class Node
{
    public data: any;
    public previous: Node | null;
    public next: Node | null;
    private _list: LinkedList;

    constructor( list: LinkedList, data: any ) {
        this._list    = list;
        this.data     = data;
        this.previous = null;
        this.next     = null;
    }

    remove(): void {
        if ( this.previous ) {
            this.previous.next = this.next;
        }

        if ( this.next ) {
            this.next.previous = this.previous;
        }

        if ( this._list.head === this ) {
            this._list.head = this.next;
        }

        if ( this._list.tail === this ) {
            this._list.tail = this.previous;
        }
        --this._list.length;

        // break references

        this.data     = null;
        this.previous = null;
        this.next     = null;
        this._list    = null;
    }
}

export default class LinkedList
{
    public head: Node | null;
    public tail: Node | null;
    public length: number;

    constructor() {
        this.head    = null;
        this.tail    = null;
        this.length  = 0;
    }

    add( data: any ): Node {
        const node = new Node( this, data );

        if ( this.length === 0 ) {
            this.head = node;
            this.tail = node;
        } else {
            this.tail.next = node;
            node.previous  = this.tail;
            this.tail      = node;
        }
        ++this.length;
        return node;
    }

    addBefore( existing: Node | any, data: any ): Node {
        const existingNode = ( existing instanceof Node ) ? existing : this.getNodeByData( existing );
        const insertedNode = new Node( this, data );

        if ( existingNode ) {
            if ( existingNode === this.head ) {
                this.head = insertedNode;
            } else {
                const existingPreviousNode = existingNode.previous;
                existingPreviousNode.next  = insertedNode;
                insertedNode.previous      = existingPreviousNode;
            }
            existingNode.previous = insertedNode;
        }
        insertedNode.next = existingNode;
        ++this.length;

        return insertedNode;
    }

    addAfter( existing: Node | any, data: any ): Node {
        const existingNode = ( existing instanceof Node ) ? existing : this.getNodeByData( existing );
        const insertedNode = new Node( this, data );

        if ( existingNode === this.tail ) {
            this.tail = insertedNode;
        } else {
            const existingNextNode    = existingNode.next;
            existingNextNode.previous = insertedNode;
            insertedNode.next         = existingNextNode;
        }
        insertedNode.previous = existingNode;
        existingNode.next     = insertedNode;
        ++this.length;

        return insertedNode;
    }

    /**
     * Remove a node from the LinkedList
     *
     * @param {Node|number|Object} object either a Node Object (fastest),
     *        numerical index of the Node or a reference to the Nodes data
     */
    remove( object: Node | number | any ): void {

        if ( object instanceof Node ) {
            object.remove();
        }
        else if ( typeof object === "number" ) {

            let currentNode = this.head;

            if ( this.length === 0 || object < 0 || object > this.length ) {
                return;
            }

            if ( object === 0 ) {
                this.head = currentNode.next;

                if ( this.head ) {
                    this.head.previous = null;
                } else {
                    this.tail = currentNode;
                }
            } else if ( object === ( this.length - 1 )) {
                this.tail      = this.tail.previous;
                this.tail.next = null;
            } else {
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
            --this.length;
        } else if ( typeof object === "object" ) {
            const currentNode = this.getNodeByData( object );

            if ( currentNode ) {
                currentNode.remove();
            }
        }
    }

    /**
     * Retrieve a linked list node by its data
     */
    getNodeByData( data: any, optCompareFn?: ( compareData: any ) => boolean ): Node | null {

        // this iteration actually performs higher
        // than using an indexOf() of on an Array referencing all
        // added data Objects (note: DATA, not Nodes)

        let currentNode = this.head;
        while ( currentNode ) {

            if ( typeof optCompareFn === "function" && optCompareFn( currentNode.data )) {
                return currentNode;
            }

            if ( currentNode.data === data ) {
                return currentNode;
            }
            currentNode = currentNode.next;
        }
        return null;
    }

    flush(): void {
        this.head    = null;
        this.tail    = null;
        this.length = 0;
    }
}
