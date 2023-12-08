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
import type { Store, createStore } from "vuex";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import type { Instrument } from "@/model/types/instrument";
import AudioService from "@/services/audio-service";
import type { EffluxState } from "@/store";

type InstrumentState = {
    muted: boolean;
    solo: boolean;
};

export default function( store: Store<EffluxState>, instrumentIndex: number, solo: boolean ): IUndoRedoState {
    const { instruments } = store.getters.activeSong;
    const instrument      = instruments[ instrumentIndex ];

    const volume   = instrument.volume;
    const wasSolod = instrument.solo;
    const wasMuted = !!instrument.muted;

    const instrumentStates: InstrumentState[] = instruments.reduce(( acc: InstrumentState[], instrument: Instrument, index: number ) => {
        acc[ index ] = {
            muted : instrument.muted,
            solo  : instrument.solo
        };
        return acc;
    }, []);

    // whether another instrument also has solo mode activated
    const hadExistingSolo = instrumentStates.some(({ solo }, index ) => index !== instrumentIndex && !!solo );


    const handleChange = ( newValue: boolean ): void => {
        const isUndo = newValue === wasSolod;
        // update volumes of all other instruments
        store.getters.activeSong.instruments.forEach(( instrument: Instrument, index: number ): void => {
            if ( index === instrumentIndex ) {
                return;
            }
            const oldState = instrumentStates[ index ];
            let volume = 0;
            if ( !oldState.muted ) {
                if ( newValue ) {
                    volume = oldState.solo ? instrument.volume : 0;
                } else {
                    volume = oldState.solo || !hadExistingSolo ? instrument.volume : 0;
                }
            }
            if ( isUndo ) {
                store.commit( "updateInstrument", { instrumentIndex: index, prop: "solo", value: oldState.solo });
            }
            AudioService.adjustInstrumentVolume( index, volume );
        });
        // update volume of this instrument
        if ( newValue ) {
            if ( wasMuted ) {
                // activating solo always unmutes instrument
                store.commit( "updateInstrument", { instrumentIndex, prop: "muted", value: false });
            }
            // as multiple channels can enable solo, force volume on for this channel
            AudioService.adjustInstrumentVolume( instrumentIndex, volume );
        } else {
            if ( wasMuted ) {
                store.commit( "updateInstrument", { instrumentIndex, prop: "muted", value: true });
            }
            AudioService.adjustInstrumentVolume( instrumentIndex, wasMuted || hadExistingSolo ? 0 : volume );
        }
    };

    // update function

    const commit = () => {
        store.commit( "updateInstrument", { instrumentIndex, prop: "solo", value: solo });
        handleChange( solo );
    };
    commit();

    return {
        undo(): void {
            store.commit( "updateInstrument", { instrumentIndex, prop: "solo", value: wasSolod });
            handleChange( wasSolod );
        },
        redo: commit
    };
}