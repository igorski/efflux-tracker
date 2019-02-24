/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
import Config              from '../../config';
import FixturesLoader      from '../../services/FixturesLoader';
import StorageUtil         from '../../utils/StorageUtil';
import InstrumentValidator from '../../model/validators/InstrumentValidator';

/* internal methods */

const persistState = state => {
    StorageUtil.setItem( Config.LOCAL_STORAGE_INSTRUMENTS, JSON.stringify( state.instruments ));
};

// a module that can store and retrieve saved instrument presets

export default {
    state: {
        /**
         * @type {Array.<Object>}
         */
        instruments : [],

        /* used when editing Instruments */

        /**
         * @type {number}
         */
        activeOscillatorIndex : 0,

        /**
         * @type {number}
         */
        instrumentId : 0,

        /**
         * @type {INSTRUMENT}
         */
        instrumentRef : null
    },
    getters: {
        getInstruments(state) {
            return state.instruments;
        },
        getInstrumentByPresetName: state => presetName => {
            let i = state.instruments.length, instrument;

            while ( i-- )
            {
                instrument = state.instruments[ i ];

                if ( instrument.presetName === presetName )
                    return instrument;
            }
            return null;
        }
    },
    mutations: {
        setInstruments(state, instruments ) {
            state.instruments = instruments;
        },
        addInstrument(state, instrument) {
            state.instruments.push(instrument);
        }
    },
    actions: {
        loadStoredInstruments({ state, commit }) {
            StorageUtil.init();
            StorageUtil.getItem( Config.LOCAL_STORAGEinstrumentS ).then(
               ( result ) => {
                   if ( typeof result === "string" ) {
                       try {
                           commit('setInstruments', JSON.parse( result ));
                       }
                       catch ( e ) {}
                   }
               },
               ( error ) => {

                   // no instruments available ? load fixtures with "factory content"

                   FixturesLoader.load(( instruments ) => {

                       commit('setInstruments')( instruments );
                       persistState(state);

                   }, "Instruments.json" );
               }
            );
        },
        saveInstrument({ commit }, instrument) {
            return new Promise((resolve, reject) => {
                if ( InstrumentValidator.isValid( instrument ) &&
                   ( typeof instrument.presetName === 'string' && instrument.presetName.length > 0 )) {

                    commit('deleteInstrument', { instrument, persist: false }); // remove duplicate instrument if existed
                    commit('addInstrument', instrument );
                    persistState(state);

                    resolve();
                } else {
                    reject();
                }
            });
        },

        /**
         * delete given instrument from the model
         *
         * @public
         * @param {Object} state
         * @param {Object} instrument
         * @param {boolean=} persist optional, whether to persist changes (defaults to true)
         *                   can be false if subsequent model operations will occur (prevents
         *                   unnecessary duplicate processing)
         */
        deleteInstrument({ state }, { instrument, persist }) {
            return new Promise((resolve, reject) => {
                let deleted = false;
                let i = this.instruments.length;

                persist = ( typeof persist === "boolean" ) ? persist : true;

                // remove duplicate instrument if existed

                while ( i-- )
                {
                    const compareInstrument = state.instruments[ i ];

                    if ( compareInstrument.presetName === instrument.presetName ) {
                        // instrument existed, name is equal, remove old instrument so we can replace it
                        state.instruments.splice( i, 1 );
                        deleted = true;
                        break;
                    }
                }

                if (deleted) {
                    if (persist)
                        persistState(state);

                    resolve();
                } else {
                    reject();
                }
            });
        }
    }
};
