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

module.exports = EditorModel;

/**
 * EditorModel stores all states of the editor such as
 * the instrument which is currently be edited, the active track
 * in the active pattern, etc.
 *
 * @constructor
 */
function EditorModel()
{
    /* instance properties */

    /**
     * which instrument is currently selected
     *
     * @public
     * @type {number}
     */
    this.activeInstrument = 0;

    /**
     * which pattern is currently selected
     *
     * @public
     * @type {number}
     */
    this.activePattern = 0;

    /**
     * which pattern step is currently selected
     *
     * @public
     * @type {number}
     */
    this.activeStep = 0;

    /**
     * the amount of steps in the currently selected pattern
     *
     * @public
     * @type {number}
     */
    this.amountOfSteps = 16;

    /**
     * whether the editor is recording notes
     * from the MIDI input device
     *
     * @public
     * @type {boolean}
     */
    this.recordingInput = false;

    /**
     * whether the sequencer should loop its
     * current range during recording
     *
     * @type {boolean}
     */
    this.loopedRecording = true;
}

EditorModel.prototype.reset = function()
{
    this.activeInstrument =
    this.activePattern    =
    this.activeStep       = 0;
    this.recordingInput   = false;
};
