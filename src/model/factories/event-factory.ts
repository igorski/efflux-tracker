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
import type { ModuleParamDef } from "@/definitions/automatable-parameters";
import type { EffluxAudioEvent } from "@/model/types/audio-event";

export default
{
    /**
     * generates the (empty) content for a single Audio Event
     *
     * @param {number=} instrument optional index of the instrument to
     *                  create the AudioEvent for
     * @param {string=} note optional note
     * @param {number=} octave optional octave
     * @param {number=} action optional action, @see audio-event.ts
     */
    create( instrument: number = 0, note: string = "", octave: number = 0, action: number = 0 ): EffluxAudioEvent
    {
        return {
            instrument,
            note,
            octave,
            action,
            recording: false,
            seq : {
                playing            : false,
                startOffset        : 0,
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
     * can be nested inside an EffluxAudioEvent
     */
    createModuleParam( module: ModuleParamDef, value: number, glide: boolean = false ): ModuleParameterChange {
        return { module, value, glide };
    }
};

export type ModuleParameterChange = {
    module: ModuleParamDef;
    value: number;
    glide: boolean
};
