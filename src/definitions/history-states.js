/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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

/**
 * These define which actions can be added to state history, allowing to
 * undo/redo them at will.
 *
 * @see history-state-factory and history-module
 */
export default
{
    ADD_EVENT                : 'S:0',
    DELETE_EVENT             : 'S:1',
    DELETE_SELECTION         : 'S:2',
    DELETE_MODULE_AUTOMATION : 'S:3',
    CLEAR_PATTERN            : 'S:4',
    PASTE_PATTERN            : 'S:5',
    ADD_PATTERN              : 'S:6',
    DELETE_PATTERN           : 'S:7',
    CUT_SELECTION            : 'S:8',
    PASTE_SELECTION          : 'S:9'
};
