/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2025 - https://www.igorski.nl
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
import { type EffluxSong } from "@/model/types/song";
import { applyModule } from "@/services/audio-service";
import { type EffluxState } from "@/store";
import { getMeasureDurationInSeconds } from "@/utils/audio-math";
import { updateEventOffsets } from "@/utils/song-util";

export const updateTempo = ( store: Store<EffluxState>, newTempo: number ): IUndoRedoState => {
    const { activeSong } = store.state.song;
    const { timing } = activeSong.meta;
    const oldTempo   = timing.tempo;

    const oldDuration = getMeasureDurationInSeconds( timing );
    const newDuration = getMeasureDurationInSeconds({ ...timing, tempo: newTempo });

    const act = (): void => {
        store.commit( "setTempo", newTempo );
        syncEvents( activeSong, oldTempo, newTempo );
        syncModules( store, activeSong, oldDuration, newDuration );
    };
    act();

    return {
        undo(): void {
            store.commit( "setTempo", oldTempo );
    
            syncEvents( activeSong, newTempo, oldTempo );
            syncModules( store, activeSong, newDuration, oldDuration );
        },
        redo: act
    };
};

/* internal methods */

/**
 * Updates existing event offsets by the tempo ratio
 */
function syncEvents( song: EffluxSong, oldTempo: number, newTempo: number ): void {
    // update existing event offsets by the tempo ratio
    updateEventOffsets( song.patterns, ( oldTempo / newTempo ));
}

/**
 * Modules that have parameters synced to the beat can adjust the timings
 * to keep the music intervals relative to the updated tempo
 */
function syncModules( store: Store<EffluxState>, song: EffluxSong, oldDuration: number, newDuration: number ): void {
    song.instruments.forEach(( instrument, instrumentIndex ) => {
        if ( instrument.delay.sync ) {
            const prop = "delay";
            const value = {
                ...instrument.delay,
                time: instrument.delay.time / oldDuration * newDuration,
            };
            store.commit( "updateInstrument", { instrumentIndex, prop, value });
            applyModule( prop, instrumentIndex, value );
        }
    });
}