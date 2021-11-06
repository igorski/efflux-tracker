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
import SampleFactory from "@/model/factories/sample-factory";
import AudioService from "@/services/audio-service";

export default {
    state: () => ({
        currentSampleName: null, // name of sample currently being edited
        sampleCache: new Map(),  // contains all sample buffers available for playback
    }),
    getters: {
        currentSample: ( state, getters ) => getters.samples.find(({ name }) => name === state.currentSampleName ),
        sampleCache: state => state.sampleCache,
        sampleFromCache: state => name => state.sampleCache.get( name ),
    },
    mutations: {
        setCurrentSample( state, { name }) {
            state.currentSampleName = name;
        },
        flushSampleCache( state ) {
            state.sampleCache.clear();
        },
        cacheSample( state, sample ) {
            state.sampleCache.set( sample.name, {
                ...sample,
                buffer: SampleFactory.getBuffer( sample, AudioService.getAudioContext() )
            });
        },
        removeSampleFromCache( state, { name }) {
            state.sampleCache.delete( name );
        },
    },
    actions: {
        cacheSongSamples({ commit }, samples = [] ) {
            commit( "flushSampleCache" );
            samples.forEach( sample => {
                commit( "cacheSample", sample );
            });
        },
    },
};
