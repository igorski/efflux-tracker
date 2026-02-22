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
import { type Store } from "vuex";
import { type IUndoRedoState } from "@/model/factories/history-state-factory";
import type { Instrument } from "@/model/types/instrument";
import AudioService, { connectAnalysers } from "@/services/audio-service";
import { type EffluxState } from "@/store";
import { clone } from "@/utils/object-util";

export default function replaceInstrument( store: Store<EffluxState>, instrument: Instrument ): IUndoRedoState {
    const instrumentIndex = store.state.editor.selectedInstrument;
    const { activeSong } = store.state.song;
    const existingInstrument = clone( activeSong.instruments[ instrumentIndex ]) as Instrument;
    instrument.index = instrumentIndex;

    const applyUpdate = ( instrument: Instrument ): void => {
        store.commit( "setSelectedOscillatorIndex", 0 );
        AudioService.cacheAllOscillators( instrumentIndex, instrument );
        AudioService.applyModules( activeSong, connectAnalysers() );
    };

    const commit = (): void => {
        store.commit( "replaceInstrument", { instrumentIndex, instrument });
        applyUpdate( instrument );
    };
    commit();

    return {
        undo(): void {
            store.commit( "replaceInstrument", { instrumentIndex, instrument: existingInstrument });
            applyUpdate( existingInstrument );
        },
        redo: commit,
    };
}
