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

/**
 * type definition for a single AudioEvent
 *
 * "id" is assigned by the AudioController at playback
 *
 * the "action" property is an enumeration describing the action of the note, e.g.:
 * 0 = nothing, 1 = noteOn, 2 = noteOff (kills previous note)
 *
 * the "recording" property describes whether the event is currently being
 * recorded (won't be played back by the SequencerController as it is being
 * played back via the MidiController)
 *
 * the "seq" Object defines the properties for playback within the
 * Sequencer and defines values in seconds
 *
 * the "mp" Object is optional and defines an optional parameter
 * change action on one of the instruments modules
 *
 * @typedef {{
 *              id: number,
 *              instrument: number,
 *              note: string,
 *              octave: number,
 *              action: number,
 *              recording: boolean,
 *              seq: {
 *                  playing: boolean,
 *                  startMeasure: number
 *                  startMeasureOffset: number,
 *                  endMeasure: number,
 *                  length: number,
 *                  mpLength: number
 *              },
 *              mp: {
 *                  module: string,
 *                  value: number,
 *                  glide: boolean
 *              }
 *          }}
 */
let AUDIO_EVENT;

const EventFactory = module.exports =
{
    /**
     * generates the (empty) content for a single Audio Event
     *
     * @public
     *
     * @param {number=} instrument optional index of the instrument to
     *                  create the AudioEvent for
     * @param {string=} note optional note
     * @param {number=} octave optional octave
     * @param {number=} action optional action
     * @return {AUDIO_EVENT}
     */
    createAudioEvent( instrument, note, octave, action )
    {
        return {
            instrument : ( typeof instrument === "number" ) ? instrument : 0,
            note       : ( typeof note === "string" )       ? note       : "",
            octave     : ( typeof octave === "number" )     ? octave     : 0,
            action     : ( typeof action === "number" )     ? action     : 0,
            recording  : false,
            seq : {
                playing            : false,
                startMeasure       : 0,
                startMeasureOffset : 0,
                endMeasure         : 0,
                length             : 0,
                mpLength           : 0
            }
        };
    },


    /**
     * generates a param change event for an instrument module
     * can be nested inside an AUDIO_EVENT
     *
     * @public
     *
     * @param {string} module
     * @param {number} value
     * @param {boolean=} glide default to false
     * @return {{
     *             module: string,
     *             value: number,
     *             glide: boolean
     *         }}
     */
    createModuleParam( module, value, glide )
    {
        return {
            module : module,
            value  : value,
            glide  : glide || false
        }
    }
};
