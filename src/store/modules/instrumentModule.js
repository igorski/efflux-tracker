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
    },
    getters: {
        getInstruments(state) {
            return state.instruments;
        },
        getInstrumentByPresetName: state => presetName => {
            return state.instruments.find(instrument => instrument.presetName === presetName);
        }
    },
    mutations: {
        setInstruments(state, instruments ) {
            state.instruments = instruments;
        },
        addInstrument(state, instrument) {
            state.instruments.push(instrument);
        },
        setInstrumentId(state, id) {
            state.instrumentId = id;
        },
        setActiveOscillatorIndex(state, index) {
            state.activeOscillatorIndex = index;
        },
        setPresetName(state, { instrument, presetName }) {
            instrument.presetName = name;
        },
    },
    actions: {
        loadStoredInstruments({ state, commit }) {
            StorageUtil.init();
            StorageUtil.getItem( Config.LOCAL_STORAGE_INSTRUMENTS ).then(
               ( result ) => {
                   if ( typeof result === "string" ) {
                       try {
                           commit('setInstruments', JSON.parse( result ));
                       }
                       catch ( e ) {
                           // that's fine...
                       }
                   }
               },
               async () => {

                   // no instruments available ? load fixtures with "factory content"
                   commit('setLoading', true);
                   const instruments = await FixturesLoader.load('Instruments.json');
                   commit('setLoading', false);

                   if (Array.isArray(instruments)) {
                       commit('setInstruments', instruments);
                       persistState(state);
                   }
               }
            );
        },
        saveInstrument({ state, commit, dispatch }, instrument) {
            return new Promise(async (resolve, reject) => {
                if ( InstrumentValidator.isValid( instrument ) &&
                   ( typeof instrument.presetName === 'string' && instrument.presetName.length > 0 )) {

                    try {
                        await dispatch('deleteInstrument', { instrument, persist: false }); // remove duplicate instrument if existed
                    }
                    catch(e) {
                        // that's fine...
                    }
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

                persist = ( typeof persist === 'boolean' ) ? persist : true;

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
        },
        importInstruments({ getters, dispatch }) {
            // inline handler to overcome blocking of the file select popup by the browser

            const fileBrowser = document.createElement('input');
            fileBrowser.setAttribute('type',   'file');
            fileBrowser.setAttribute('accept', Config.INSTRUMENT_FILE_EXTENSION);

            const simulatedEvent = document.createEvent('MouseEvent');
            simulatedEvent.initMouseEvent(
                'click', true, true, window, 1,
                 0, 0, 0, 0, false,
                 false, false, false, 0, null
            );
            fileBrowser.dispatchEvent(simulatedEvent);
            
            return new Promise((resolve, reject) => {
                fileBrowser.addEventListener( 'change', fileBrowserEvent => {
                    const reader = new FileReader();
    
                    reader.onerror = () => {
                        reject(getters.getCopy('ERROR_FILE_LOAD'));
                    };
    
                    reader.onload = readerEvent => {
                        const fileData    = readerEvent.target.result;
                        const instruments = JSON.parse(window.atob(fileData));
    
                        // check if we're dealing with valid instruments
    
                        if (Array.isArray(instruments)) {
                            let amountImported = 0;
                            instruments.forEach(async instrument => {
                                if (InstrumentValidator.isValid(instrument)) {
                                    await dispatch('saveInstrument', instrument);
                                    ++amountImported;
                                }
                            });
                            resolve(amountImported);
                        } else {
                            resolve(getters.getCopy('ERROR_INSTRUMENT_IMPORT'));
                        }
                    };
                    // start reading file contents
                    reader.readAsText( fileBrowserEvent.target.files[ 0 ] );
                });
            });
        },
        exportInstruments({ state }) {
            return new Promise((resolve, reject) => {
                if (Array.isArray(state.instruments ) && state.instruments.length > 0) {

                    // encode instrument data

                    const data = window.btoa(JSON.stringify(state.instruments));

                    // download file to disk

                    const pom = document.createElement('a');
                    pom.setAttribute('href', `data:application/json;charset=utf-8, ${encodeURIComponent(data)}`);
                    pom.setAttribute('target', '_blank' ); // helps for Safari (opens content in window...)
                    pom.setAttribute('download', `efflux_instrument_presets${Config.INSTRUMENT_FILE_EXTENSION}` );
                    pom.click();

                    resolve();
                } else {
                    reject();
                }
            });
        }
    }
};
