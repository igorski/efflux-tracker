/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
 * These define the editor actions that can be invoked from multiple origins
 * (e.g. keyboard-service when dealing with a shortcut, visual editors, mouse
 * actions inside the pattern editor, etc.). These actions can also be added to
 * state history, allowing to undo/redo them at will.
 *
 * @see action-factory, history-state-factory and history-module
 */
export default
{
    ADD_EVENT                : "S:0",
    DELETE_EVENT             : "S:1",
    DELETE_SELECTION         : "S:2",
    ADD_MODULE_AUTOMATION    : "S:3",
    DELETE_MODULE_AUTOMATION : "S:4",
    CLEAR_PATTERN            : "S:5",
    PASTE_PATTERN            : "S:6",
    PASTE_PATTERN_MULTIPLE   : "S:7",
    ADD_PATTERN              : "S:8",
    DELETE_PATTERN           : "S:9",
    CUT_SELECTION            : "S:10",
    PASTE_SELECTION          : "S:11",
    TEMPO_CHANGE             : "S:12",
    REPLACE_INSTRUMENT       : "S:13",
};
