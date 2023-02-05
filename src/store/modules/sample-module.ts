/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
import type { Commit, Module } from "vuex";
import SampleFactory from "@/model/factories/sample-factory";
import type { Instrument, InstrumentOscillator } from "@/model/types/instrument";
import type { Sample } from "@/model/types/sample";
import AudioService from "@/services/audio-service";

export interface SampleState {
    currentSampleId: string | null; // id of sample currently being edited
    sampleCache: Map<string, Sample>; // contains all sample buffers available for playback
};

export const createSampleState = ( props?: Partial<SampleState> ): SampleState => ({
    currentSampleId: null,
    sampleCache: new Map(),
    ...props
});

const SampleModule: Module<SampleState, any> = {
    state: (): SampleState => createSampleState(),
    getters: {
        currentSample: ( state: SampleState, getters: any ): Sample => {
            return getters.samples.find(( s: Sample ) => s.id === state.currentSampleId );
        },
        sampleCache: ( state: SampleState ): Map<string, Sample> => state.sampleCache,
        sampleFromCache: ( state: SampleState ) => ( name: string ): Sample => state.sampleCache.get( name ),
    },
    mutations: {
        setCurrentSample( state: SampleState, sample: Sample ): void {
            state.currentSampleId = sample.id ?? null;
        },
        flushSampleCache( state: SampleState ): void {
            state.sampleCache.clear();
        },
        /* caching works on name basis (names are used across sessions - contrary to ids - and referenced by instruments) */
        cacheSample( state: SampleState, sample: Sample ): void {
            state.sampleCache.set( sample.name, {
                ...sample,
                buffer: SampleFactory.getBuffer( sample, AudioService.getAudioContext() )
            });
        },
        removeSampleFromCache( state: SampleState, { name } : { name: string }): void {
            state.sampleCache.delete( name );
        },
    },
    actions: {
        cacheSongSamples({ commit } : { commit: Commit }, samples: Sample[] = [] ): void {
            commit( "flushSampleCache" );
            samples.forEach( sample => {
                commit( "cacheSample", sample );
            });
        },
        updateSampleName({ getters, commit }: { getters: any, commit: Commit },
            { id, name }: { id: string, name: string }): string {
            const sample = getters.samples.find(( s: Sample ) => s.id === id );
            // first check if name exists under different id as we don't take kindly to duplicates
            const hasDuplicate = getters.samples.find(( s: Sample ) => s.name === name && s.id !== id );
            if ( hasDuplicate ) {
                name += " #2";
            }
            const currentName   = sample.name;
            const updatedSample = { ...sample, name };

            commit( "removeSampleFromCache", sample );
            commit( "updateSample", updatedSample );
            commit( "cacheSample", updatedSample );

            // update all instruments as the sample name is the key
            getters.activeSong.instruments.forEach(( instrument: Instrument, instrumentIndex: number ) => {
                instrument.oscillators.forEach(( oscillator: InstrumentOscillator, oscillatorIndex: number ) => {
                    if ( oscillator.sample === currentName ) {
                        commit( "updateOscillator", {
                            instrumentIndex, oscillatorIndex, prop: "sample", value: name
                        });
                    }
                });
            });
            return name;
        }
    },
};
export default SampleModule;
