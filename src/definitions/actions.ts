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

/**
 * These define the editor actions that can be invoked from multiple origins
 * (e.g. keyboard-service when dealing with a shortcut, visual editors, mouse
 * actions inside the pattern editor, etc.). These actions can also be added to
 * state history, allowing to undo/redo them at will.
 *
 * @see action-factory, history-state-factory and history-module
 */
enum Actions
{
    ADD_EVENTS = 0,
    DELETE_SELECTION,
    ADD_MODULE_AUTOMATION,
    DELETE_MODULE_AUTOMATION,
    CUT_SELECTION,
    PASTE_SELECTION,
    TEMPO_CHANGE,
    REPLACE_INSTRUMENT,
    TRANSPOSE,
    UPDATE_PATTERN_ORDER,
};
export default Actions;
