import { describe, it, expect, vi } from "vitest";
import type { MutationTree, ActionTree } from "vuex";
import Config from "@/config";
import songModule, { createSongState } from "@/store/modules/song-module";
import type { SongState } from "@/store/modules/song-module";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory, { FACTORY_VERSION } from "@/model/factories/song-factory";
import PubSubMessages from "@/services/pubsub/messages";
import { type EffluxSong, type EffluxSongMeta, EffluxSongType } from "@/model/types/song";
import SongValidator from "@/model/validators/song-validator";
import { createSample } from "../../mocks";

const getters: any = songModule.getters;
const mutations: MutationTree<SongState> = songModule.mutations;
const actions: ActionTree<SongState, any> = songModule.actions;

// mocks

let mockFn: ( fnName: string, ...args: any ) => void;
vi.mock( "@/services/dropbox-service", () => ({
    uploadBlob: vi.fn(( ...args ): void => mockFn( "uploadBlob", ...args )),
    getCurrentFolder: vi.fn(() => "folder")
}));
vi.mock( "@/utils/file-util", () => ({
    saveAsFile: vi.fn(( ...args ) => mockFn( "saveAsFile", ...args )),
}));
vi.mock( "@/utils/storage-util", () => ({
    default: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
    }
}));
vi.mock( "@/utils/xtk-util", () => ({
    toXTK: vi.fn(( ...args ) => mockFn( "toXTK" , ...args )),
    parseXTK: vi.fn(( ...args ) => mockFn( "parseXTK", ...args ))
}));

describe( "Vuex song module", () => {
    const createSong = ( props?: Partial<EffluxSong> ): EffluxSong => {
        const song = SongFactory.create( 8 );
        return {
            ...song,
            ...props
        };
    };

    describe( "getters", () => {
        it( "should be able to retrieve all the songs", () => {
            const state = createSongState({ songs: [] });
            expect( getters.songs( state )).toEqual( state.songs );
        });

        it( "should be able to retrieve the active song", () => {
            const state = createSongState({ activeSong: createSong() });
            expect( getters.activeSong( state )).toEqual( state.activeSong );
        });

        it( "should consider jam mode active when the active song is of the JAM type", () => {
            const state = createSongState({ activeSong: createSong() });
            expect( getters.jamMode( state )).toEqual( false );
            state.activeSong.type = EffluxSongType.JAM;
            expect( getters.jamMode( state )).toEqual( true );
        });

        it( "should be able to retrieve all registered samples within the active song", () => {
            const state = createSongState({
                activeSong: createSong({
                    samples: [ createSample( "foo" ), createSample( "bar" ), createSample( "baz" ) ]
                })
            });
            expect( getters.samples( state )).toEqual( state.activeSong.samples );
        });

        it( "should be able to retrieve individual songs by their id", async () => {
            const song = SongFactory.create( 8 );
            const state = createSongState({ songs: [ song ] } as unknown);
            const retrieved = getters.getSongById( state )( song.id );
            expect( song ).toEqual( retrieved );
        });

        it( "should be able to detect changes to the currently loaded song", () => {
            const state = createSongState({ statesOnSave: 10 });
            const mockedGetters = { totalSaved: 10 };

            expect( getters.hasChanges( state, mockedGetters )).toBe( false );

            ++mockedGetters.totalSaved; // increment amount of saved states

            expect( getters.hasChanges( state, mockedGetters )).toBe( true );
        });
    });

    describe( "mutations", () => {
        it( "should be able to toggle the song save message state", () => {
            const state = createSongState({ showSaveMessage: false });
            mutations.setShowSaveMessage( state, true );
            expect( state.showSaveMessage ).toBe( true );
        });

        it( "should be able to set the samples", () => {
            const state = createSongState({ activeSong: createSong({ samples: [] }) });
            const samples = [ createSample( "foo" ), createSample( "bar" ), createSample( "baz" ) ];
            mutations.setSamples( state, samples );
            expect( state.activeSong.samples ).toEqual( samples );
        });

        it( "should be able to add a sample to the existing list", () => {
            const state = createSongState({
                activeSong: createSong({
                    samples: [ createSample( "foo", "s1" ), createSample( "bar", "s2" ), createSample( "baz", "s3" ) ]
                })
            });
            const sample = createSample( "qux", "s4" );
            mutations.addSample( state, sample );
            expect( state.activeSong.samples ).toEqual(
                [ createSample( "foo", "s1" ), createSample( "bar", "s2" ), createSample( "baz", "s3" ), createSample( "qux", "s4" ) ]
            );
        });

        it( "should be able to remove a sample from the existing list", () => {
            const samples = [ createSample( "foo", "s1" ), createSample( "bar", "s2" ), createSample( "baz", "s3" ) ];
            const state = createSongState({
                activeSong: createSong({ samples: [ ...samples ] })
            });

            mutations.removeSample( state, samples[ 1 ]);

            expect( state.activeSong.samples ).toEqual([ samples[ 0 ], samples[ 2 ] ]);
        });

        it( "should be able to flush all currently registered samples", () => {
            const state = createSongState({
                activeSong: createSong({
                    samples: [ createSample( "foo" ), createSample( "bar" ), createSample( "baz" ) ]
                })
            });
            mutations.flushSamples( state );
            expect( state.activeSong.samples ).toHaveLength( 0 );
        });

        it( "should be able to update a registered sample of the same name as the given sample", () => {
            const state = createSongState({
                activeSong: createSong({
                    samples: [ createSample( "foo", "s1" ), createSample( "bar", "s2" ), createSample( "baz", "s3" )]
                })
            });
            mutations.updateSongSample( state, { id: "s2", name: "qux" });

            expect( state.activeSong.samples ).toHaveLength( 3 );
            const [ first, second, third ] = state.activeSong.samples;

            expect( first.name ).toEqual( "foo" );
            expect( second.name ).toEqual( "qux" );
            expect( third.name ).toEqual( "baz" );
        });

        it( "should be able to set the amount of stored states upon song save", () => {
            const state = createSongState({ statesOnSave: 0 });
            mutations.setStatesOnSave( state, 5 );
            expect( state.statesOnSave ).toEqual( 5 );
        });

        it( "should be able to replace the existing patterns", () => {
            const state = createSongState({ activeSong: createSong() });
            const patterns = [ PatternFactory.create(), PatternFactory.create() ];
            mutations.replacePatterns( state, patterns );

            expect( state.activeSong.patterns ).toEqual( patterns );
        });

        it( "should be able to replace the existing pattern order", () => {
            const state = createSongState({ activeSong: createSong() });
            const order = [ 0, 1, 1, 2 ];
            mutations.replacePatternOrder( state, order );

            expect( state.activeSong.order ).toEqual( order );
        });
    });

    describe( "actions", () => {
        it( "should be able to open a song", () => {
            const song = { name: "awesomeTune", samples: [ createSample( "foo" )] };
            const commit = vi.fn();
            const dispatch = vi.fn();

            // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
            actions.openSong({ commit, dispatch }, song );

            expect( commit ).toHaveBeenNthCalledWith( 1, "flushSamples" );
            expect( commit ).toHaveBeenNthCalledWith( 2, "setActiveSong", song );
            expect( commit ).toHaveBeenNthCalledWith( 3, "setSamples", song.samples );
            expect( commit ).toHaveBeenNthCalledWith( 4, "setStatesOnSave", 0 );
            expect( commit ).toHaveBeenNthCalledWith( 5, "resetJamChannels" );
            expect( dispatch ).toHaveBeenNthCalledWith( 1, "cacheSongSamples", song.samples );
        });

        describe( "when calling the create song action", () => {
            it( "should be able to create songs with unique identifiers", async () => {
                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                const song = await actions.createSong();

                expect( SongValidator.isValid( song )).toBe( true );
                expect( song.patterns ).toHaveLength( 1 );
                expect( song.order ).toHaveLength( 1 );

                for ( let i = 0; i < 16; ++i ) {
                    // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                    const compare = await actions.createSong();
                    // songs should have unique identifiers
                    expect( song.id ).not.toEqual( compare.id );
                }
            });

            it( "should automatically create a preset pattern and order list for JAM-type songs", async () => {
                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                const song = await actions.createSong({}, EffluxSongType.JAM );
                expect( song.patterns ).toHaveLength( Config.JAM_MODE_PATTERN_AMOUNT );
                expect( song.order ).toHaveLength( Config.JAM_MODE_PATTERN_AMOUNT );
            });
        });

        describe( "when saving songs into local storage", () => {
            const mockedGetters = {
                t: vi.fn(),
                totalSaved: 10 // history-module
            };
            const dispatch = vi.fn();
            let commit: ( mutationName: string, ...args: any ) => void;

            it( "should be able to save songs in storage and show a save message", async () => {
                commit = vi.fn();

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                const song = await actions.createSong();
                const state = createSongState({
                    songs: [],
                    showSaveMessage: true
                });

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.saveSongInLS({ state, getters: mockedGetters, commit, dispatch }, song);

                // expected songs meta to have been saved into the song list
                expect( state.songs ).toEqual([{
                    id: song.id,
                    meta: song.meta,
                    type: song.type,
                }]);
                expect( commit ).toHaveBeenNthCalledWith( 1, "setStatesOnSave", mockedGetters.totalSaved );
                expect( commit ).toHaveBeenNthCalledWith( 3, "showNotification", { message: undefined });
            });

            it( "should be able to save songs in storage and suppress the save message when requested", async () => {
                commit = vi.fn();

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                const song = await actions.createSong();
                const state = createSongState({ songs: [], showSaveMessage: false });

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.saveSongInLS({ state, getters: mockedGetters, commit, dispatch }, song);

                expect( commit ).not.toHaveBeenNthCalledWith( 2, "showNotification" );
            });

            it( "should update the modified timestamp when saving a song", async () => {
                commit = vi.fn();

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                const song = await actions.createSong();

                const state = createSongState({ songs: [ song ] });
                const org = song.meta.modified;

                expect( song.meta.created ).toEqual( song.meta.modified );

                return new Promise(( resolve ): void => {
                    setTimeout( async (): Promise<void> => {
                        // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                        await actions.saveSongInLS({ state, getters: mockedGetters, commit, dispatch }, song);

                        expect( song.meta.created ).toEqual( org ); // expected creation timestamp to have remained unchanged after saving
                        expect( song.meta.modified ).not.toEqual( org ); // expected modified timestamp to have updated after saving

                        // @ts-expect-error expected 1 arguments
                        resolve();
                    }, 1 );
                });
            });

            it( "should broadcast the save event", async () => {
                commit = vi.fn();

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                const song = await actions.createSong();
                const state = createSongState({ songs: [], showSaveMessage: false });

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.saveSongInLS({ state, getters: mockedGetters, commit, dispatch }, song);

                expect( commit ).toHaveBeenCalledWith( "publishMessage", PubSubMessages.SONG_SAVED );
            });

            it( "should not broadcast the save event when saving factory fixtures", async () => {
                commit = vi.fn();

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                const song = await actions.createSong();
                song.fixture = true;

                const state = createSongState({ songs: [], showSaveMessage: false });

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.saveSongInLS({ state, getters: mockedGetters, commit, dispatch }, song);

                expect( commit ).not.toHaveBeenCalledWith( "publishMessage", PubSubMessages.SONG_SAVED );
            });
        });

        it( "should be able to delete songs from local storage", async () => {
            // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
            const song = await actions.createSong();
            const state = createSongState({ songs: [ song ]});

            // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
            await actions.deleteSongFromLS({ state }, { song });

            expect(state.songs).toEqual([]);
        });

        describe( "when exporting songs", () => {
            it( "should serialize the Song as an .XTK file and save it as a file when exporting to disk", async () => {
                mockFn = vi.fn(() => Promise.resolve({}));
                const song = createSong({ meta: { title: "foo" } as EffluxSongMeta });
                const commit = vi.fn();

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.exportSong({ commit }, song );

                expect( mockFn ).toHaveBeenNthCalledWith( 1, "toXTK", song );
                expect( mockFn ).toHaveBeenNthCalledWith( 2, "saveAsFile", expect.any( Object ), expect.any( String ));
                expect( commit ).toHaveBeenCalledWith( "publishMessage", expect.any( String ));
            });

            it( "should serialize the Song as an .XTK file and store it remotely when exporting to Dropbox", async () => {
                const song = createSong({ meta: { title: "foo" } as EffluxSongMeta });

                mockFn = vi.fn(() => Promise.resolve({}));
                const commit = vi.fn();
                const mockedGetters = { t: vi.fn(), totalSaved: 7 };

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.exportSongToDropbox({ commit, getters: mockedGetters }, { song, folder: "foo" });

                expect( mockFn ).toHaveBeenNthCalledWith( 1, "toXTK", song );
                expect( mockFn ).toHaveBeenNthCalledWith( 2, "uploadBlob", expect.any( Object ), "foo", expect.any( String ));
                expect( commit ).toHaveBeenNthCalledWith( 1, "setStatesOnSave", mockedGetters.totalSaved );
                expect( commit ).toHaveBeenNthCalledWith( 2, "showNotification", expect.any( Object ));

                expect( song.origin ).toEqual( "dropbox" );
            });
        });

        describe( "when calling the SaveSong action", () => {
            it( "should validate the given Song", async () => {
                const dispatch = vi.fn();
                const song = createSong({ id: "foo" });
                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.saveSong({ dispatch }, song );
                expect( dispatch ).toHaveBeenNthCalledWith( 1, "validateSong", song );
            });

            it( "should save the song in Local Storage when no origin is specified", async () => {
                const dispatch = vi.fn();
                const song = createSong({ id: "bar" });
                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.saveSong({ dispatch, commit: vi.fn() }, song );
                expect( dispatch ).toHaveBeenNthCalledWith( 2, "saveSongInLS", song );
            });

            it( "should save the song in Dropbox when the Dropbox origin is specified", async () => {
                const dispatch = vi.fn();
                const song = createSong({ id: "baz", origin: "dropbox" });
                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.saveSong({ dispatch, commit: vi.fn() }, song );
                expect( dispatch ).toHaveBeenNthCalledWith( 2, "exportSongToDropbox", { song, folder: "folder" });
            });

            it( "should update the song version to reflect the latest SongFactory version", async () => {
                const dispatch = vi.fn();
                const song = createSong({ id: "baz", origin: "dropbox" });
                song.version = 1;

                // @ts-expect-error Not all constituents of type 'Action<SequencerState, any>' are callable
                await actions.saveSong({ dispatch, commit: vi.fn() }, song );
                expect( song.version ).toEqual( FACTORY_VERSION );
            });
        });
    });
});
