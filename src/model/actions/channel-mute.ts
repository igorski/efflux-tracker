/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2023 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the 'Software'), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import type { Store } from "vuex";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import type { Instrument } from "@/model/types/instrument";
import AudioService from "@/services/audio-service";
import type { EffluxState } from "@/store";

function hasSolo( store: Store<EffluxState>, instrumentIndex: number ): boolean {
    // whether one or more of the other channels in the songs instrument list has solo enabled
    return store.getters.activeSong.instruments.find(( instrument: Instrument, index: number ):  boolean => {
        return index !== instrumentIndex && instrument.solo;
    });
}

export default function( store: Store<EffluxState>, instrumentIndex: number, mute: boolean ): IUndoRedoState {
    const instrument = store.getters.activeSong.instruments[ instrumentIndex ];

    const wasMuted = !!instrument.muted;
    const wasSolod = instrument.solo;
    const volume   = instrument.volume;

    // whether another instrument was solod
    const hadExistingSolo = hasSolo( store, instrumentIndex );

    const handleChange = ( targetValue: boolean ): void => {
        let targetVolume = targetValue ? 0 : volume;
        const isUndo = targetValue === wasMuted;
        if ( targetValue ) {
            if ( wasSolod ) {
                // activating mute always unsolos instrument
                store.commit( "updateInstrument", { instrumentIndex, prop: "solo", value: false });
            }
        } else if ( hadExistingSolo && isUndo ) {
            targetVolume = 0;
        }
        AudioService.adjustInstrumentVolume( instrumentIndex, targetVolume );
    };

    // update function

    const commit = () => {
        store.commit( "updateInstrument", { instrumentIndex, prop: "muted", value: mute });
        handleChange( mute );
    };
    commit();

    return {
        undo(): void {
            store.commit( "updateInstrument", { instrumentIndex, prop: "muted", value: wasMuted });
            handleChange( wasMuted )
        },
        redo: commit
    };
}