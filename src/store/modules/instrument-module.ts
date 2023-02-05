/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
import type { ActionContext, Commit, Dispatch, Module } from "vuex";
import Config from "@/config";
import Actions from "@/definitions/actions";
import { INSTRUMENT_FILE_EXTENSION } from "@/definitions/file-types";
import OscillatorTypes from "@/definitions/oscillator-types";
import FixturesLoader from "@/services/fixtures-loader";
import StorageUtil from "@/utils/storage-util";
import createAction from "@/model/factories/action-factory";
import { createFromSaved } from "@/model/factories/instrument-factory";
import SampleFactory from "@/model/factories/sample-factory";
import { serialize as serializeSample } from "@/model/serializers/sample-serializer";
import type { Instrument, InstrumentSerialized } from "@/model/types/instrument";
import type { Sample } from "@/model/types/sample";
import InstrumentValidator from "@/model/validators/instrument-validator";
import { clone } from "@/utils/object-util";
import { openFileBrowser, readTextFromFile, saveAsFile } from "@/utils/file-util";

export const INSTRUMENT_STORAGE_KEY = "Efflux_Ins_";
export const getStorageKeyForInstrument = ({ presetName }: { presetName: string }) => `${INSTRUMENT_STORAGE_KEY}${presetName.replace( /\s/g, "" )}`;

// module that can store and retrieve saved instrument presets

export interface InstrumentState {
    instruments: ( Instrument | InstrumentMeta )[];
};

export const createInstrumentState = ( props?: Partial<InstrumentState> ): InstrumentState => ({
    instruments: [],
    ...props
});

type InstrumentMeta = {
    presetName: string;
};

const InstrumentModule: Module<InstrumentState, any> = {
    state: (): InstrumentState => createInstrumentState(),
    getters: {
        getInstruments( state: InstrumentState ): ( Instrument | InstrumentMeta )[] {
            return state.instruments;
        },
        getInstrumentByPresetName: ( state: InstrumentState ) => ( presetName: string ): Instrument | InstrumentMeta => {
            return state.instruments.find(( instrument: Instrument ) => instrument.presetName === presetName );
        }
    },
    mutations: {
        setInstruments( state: InstrumentState, instruments: Instrument[] ): void {
            state.instruments = instruments;
        },
        // @ts-expect-error 'state' is declared but its value is never read.
        setPresetName( state: InstrumentState, { instrument, presetName }: { instrument: Instrument, presetName: string }): void {
            instrument.presetName = presetName;
        }
    },
    actions: {
        loadStoredInstruments({ commit, dispatch } : { commit: Commit, dispatch: Dispatch }): void {
            StorageUtil.init();
            StorageUtil.getItem( Config.LOCAL_STORAGE_INSTRUMENTS ).then( async ( result: string ): Promise<void> => {
                   if ( typeof result === "string" ) {
                       try {
                           const instruments = JSON.parse( result );
                           let wasLegacyStorageFormat = false;

                           // if instrument contained oscillators, we know that the storage was using
                           // the legacy format where all instruments were serialized in a single list
                           // convert the storage to the new memory-friendly format

                           for ( const instrument of instruments ) {
                               if ( Array.isArray( instrument.oscillators )) {
                                   await dispatch( "saveInstrumentIntoLS" , instrument );
                                   wasLegacyStorageFormat = true;
                               }
                           }
                           if ( !wasLegacyStorageFormat ) {
                               commit( "setInstruments", instruments );
                           }
                       }
                       catch ( e ) {
                           // that's fine...
                       }
                   }
               },
               async (): Promise<void> => {
                   // no instruments available ? load fixtures with "factory content"
                   commit( "setLoading", "INS" );
                   const instruments = await FixturesLoader.load( "Instruments.json" );
                   commit( "unsetLoading", "INS" );
                   if ( Array.isArray( instruments )) {
                       for ( let i = 0; i < instruments.length; ++i ) {
                           await dispatch( "saveInstrumentIntoLS", instruments[ i ]);
                       }
                   }
               }
            );
        },
        async loadInstrumentFromFile( storeRef: ActionContext<InstrumentState, any>, file: File | Blob ): Promise<void> {
            try {
                const fileData = await readTextFromFile( file );
                const instrumentData = JSON.parse( window.atob( fileData ))[ 0 ]; // always exported in Array

                if ( InstrumentValidator.isValid( instrumentData )) {
                    const instrument = await assembleInstrumentFromJSON( storeRef, instrumentData );
                    createAction( Actions.REPLACE_INSTRUMENT, {
                        store: storeRef,
                        instrument,
                    });
                }
            } catch {
                storeRef.commit( "showError", storeRef.getters.t( "errors.fileLoad" ));
            }
        },
        loadInstrumentFromLS({ getters, commit }: { getters: any, commit: Commit },
            instrumentDef: Instrument | InstrumentMeta ): Promise<Instrument> {
            return new Promise( async ( resolve, reject ): Promise<void> => {
                const storedInstrument = await StorageUtil.getItem( getStorageKeyForInstrument( instrumentDef ));
                if ( !storedInstrument ) {
                    reject();
                }
                const instrument = await assembleInstrumentFromJSON({ getters, commit }, JSON.parse( storedInstrument ));
                resolve( instrument );
            });
        },
        saveInstrumentIntoLS({ state, getters, dispatch }: { state: InstrumentState, getters: any, dispatch: Dispatch },
            instrument: Instrument ): Promise<void> {
            return new Promise( async ( resolve, reject ): Promise<void> => {
                if ( InstrumentValidator.isValid( instrument ) &&
                   ( typeof instrument.presetName === "string" && instrument.presetName.length > 0 )) {
                    try {
                        // remove duplicate instrument when existing
                        await dispatch( "deleteInstrument", { instrument, persist: false });
                    }
                    catch ( e ) {
                        // that's fine...
                    }
                    // push instrument into instrument list
                    state.instruments.push( getMetaForInstrument( instrument ));
                    persistState( state );

                    // serialize instrument and save instrument into storage
                    StorageUtil.setItem(
                        getStorageKeyForInstrument( instrument ),
                        JSON.stringify( await serializeInstrument( instrument, getters.samples ) )
                    );
                    resolve();
                } else {
                    reject();
                }
            });
        },
        /**
         * delete given instrument from the model
         * note: persist is optional and defines whether to persist changes (defaults to true)
         * can be false if subsequent model operations will occur (prevents
         * unnecessary duplicate processing)
         */
        deleteInstrument({ state }: { state: InstrumentState },
            { instrument, persist = true }: { instrument: Instrument, persist?: boolean }): Promise<void> {
            return new Promise(( resolve, reject ): void => {
                let deleted = false;
                let i = state.instruments.length;

                // remove duplicate instrument if existed

                while ( i-- ) {
                    const compareInstrument = state.instruments[i];
                    if ( compareInstrument.presetName === instrument.presetName ) {
                        // instrument existed, name is equal, remove old instrument from list so we can replace it
                        state.instruments.splice( i, 1 );

                        // remove instrument storage entry
                        StorageUtil.removeItem( getStorageKeyForInstrument( instrument ));
                        deleted = true;
                        break;
                    }
                }

                if ( deleted ) {
                    if ( persist ) {
                        persistState( state );
                    }
                    resolve();
                } else {
                    reject();
                }
            });
        },
        importInstruments({ getters, dispatch }: { getters: any, dispatch: Dispatch }): Promise<string | number> {
            // directly invoke file browser to overcome blocking of the file select popup by the browser
            type EventDef = Event & { target: HTMLInputElement };
            let fileHandlerFn: ( fileBrowserEvent: EventDef ) => Promise<void>;

            openFileBrowser(( fileBrowserEvent: EventDef ) => {
                fileHandlerFn( fileBrowserEvent );
            }, [ INSTRUMENT_FILE_EXTENSION ]);

            return new Promise(( resolve, reject ): void => {
                fileHandlerFn = async ( fileBrowserEvent: EventDef ): Promise<void> => {
                    try {
                        const fileData = await readTextFromFile( fileBrowserEvent.target.files[ 0 ] );
                        const instruments = JSON.parse( window.atob( fileData ));

                        // check if we're dealing with valid instruments

                        if ( Array.isArray( instruments )) {
                            let amountImported = 0;
                            for ( const instrument of instruments ) {
                                if ( InstrumentValidator.isValid( instrument )) {
                                    await dispatch( "saveInstrumentIntoLS", instrument );
                                    ++amountImported;
                                }
                            }
                            resolve( amountImported );
                        } else {
                            resolve( getters.t( "errors.instrumentImport", { extension: INSTRUMENT_FILE_EXTENSION }));
                        }
                    } catch {
                        reject( getters.t( "errors.fileLoad" ));
                    }
                };
            });
        },
        exportInstrument({ getters, dispatch }: { getters: any, dispatch: Dispatch },
            instrumentMeta: Partial<InstrumentMeta> ): Promise<void> {
            return new Promise( async( resolve, reject ) => {
                try {
                    const instrument = await dispatch( "loadInstrumentFromLS", getters.getInstrumentByPresetName( instrumentMeta.presetName ));
                    const serialized = await serializeInstrument( instrument, getters.samples );
                    downloadInstrumentFile([ serialized ], `${instrumentMeta.presetName}${INSTRUMENT_FILE_EXTENSION}` );
                    resolve();
                } catch {
                    reject();
                }
            });
        },
        exportInstruments({ state, getters, dispatch }: { state: InstrumentState, getters: any, dispatch: Dispatch }): Promise<void> {
            return new Promise( async ( resolve, reject ): Promise<void> => {
                if ( Array.isArray( state.instruments ) && state.instruments.length > 0 ) {
                    // retrieve all instrument data
                    const instruments: InstrumentSerialized[] = [];
                    for ( const ins of state.instruments ) {
                        const instrument = await dispatch( "loadInstrumentFromLS", getters.getInstrumentByPresetName( ins.presetName ));
                        instruments.push( await serializeInstrument( instrument, getters.samples ));
                    }
                    downloadInstrumentFile( instruments, `efflux_instrument_presets${INSTRUMENT_FILE_EXTENSION}` );
                    resolve();
                } else {
                    reject();
                }
            });
        }
    }
};

/* internal methods */

const getMetaForInstrument = ( instrument: Instrument ): InstrumentMeta => ({
    presetName: instrument.presetName,
});

const downloadInstrumentFile = ( instrumentList: InstrumentSerialized[], fileName: string ): void => {
    // encode instrument data
    const data = window.btoa( JSON.stringify( instrumentList ));

    // download file to disk
    saveAsFile(
        `data:application/json;charset=utf-8, ${encodeURIComponent(data)}`, fileName
    );
};

const persistState = ( state: InstrumentState ): Promise<void> => StorageUtil.setItem( Config.LOCAL_STORAGE_INSTRUMENTS, JSON.stringify( state.instruments ));

const serializeInstrument = async ( instrumentToSave: Instrument, songSampleList: Sample[] ): Promise<InstrumentSerialized> => {
    const instrument = clone( instrumentToSave ) as unknown as InstrumentSerialized; // note type cast

    // serialize used samples (these are managed by the song, but on import/export
    // of individual instruments these are serialized as part of the instrument "bundle")

    for ( const oscillator of instrument.oscillators ) {
        if ( oscillator.waveform !== OscillatorTypes.SAMPLE ) {
            continue;
        }
        const sampleName = oscillator.sample as unknown as string; // original instrument has string, serialized will have XTKSample
        const sampleEntity = songSampleList.find(( s: Sample ) => s.name === sampleName );
        if ( sampleEntity ) {
            oscillator.sample = await serializeSample( sampleEntity );
        }
    }
    return instrument;
};

const assembleInstrumentFromJSON = async({ getters, commit }: { getters: any, commit: Commit },
    json: Instrument ): Promise<Instrument> => {
    const instrument = createFromSaved( json );
    for ( const oscillator of instrument.oscillators ) {
        if ( oscillator.sample && typeof oscillator.sample === "object" ) {
            const sample = await SampleFactory.deserialize( oscillator.sample );
            if ( sample ) {
                // if sample didn't exist in song sample list yet, add it now
                if ( !getters.samples.find(( s: Sample ) => s.name === sample.name )) {
                    commit( "addSample", sample );
                    commit( "cacheSample", sample );
                }
                // sample can now be referenced by name, active instruments
                // should never manage their own sample (the song is responsible
                // for managing all its used resources)
                oscillator.sample = sample.name;
            }
        }
    }
    return instrument;
};
export default InstrumentModule;
