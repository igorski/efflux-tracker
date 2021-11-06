import songModule    from "@/store/modules/song-module";
import SongValidator from "@/model/validators/song-validator";

const { getters, mutations, actions } = songModule;

// mocks

let mockFn;
jest.mock( "@/services/dropbox-service", () => ({
    uploadBlob: jest.fn(( ...args ) => mockFn( "uploadBlob", ...args )),
}));
jest.mock( "@/utils/file-util", () => ({
    saveAsFile: jest.fn(( ...args ) => mockFn( "saveAsFile", ...args )),
}));
jest.mock( "@/utils/storage-util", () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
}));
jest.mock( "@/utils/xtk-util", () => ({
    toXTK: jest.fn(( ...args ) => mockFn( "toXTK" , ...args )),
    parseXTK: jest.fn(( ...args ) => mockFn( "parseXTK", ...args ))
}));

describe( "Vuex song module", () => {
    describe( "getters", () => {
        it( "should be able to retrieve all the songs", () => {
            const state = { songs: [] };
            expect( getters.songs( state )).toEqual( state.songs );
        });

        it( "should be able to retrieve the active song", () => {
            const state = { activeSong: {} };
            expect( getters.activeSong( state )).toEqual( state.activeSong );
        });

        it( "should be able to retrieve all registered samples within the active song", () => {
            const state = {
                activeSong: { samples: [{ name: "foo" }, { name: "bar" }, { name: "baz" } ] }
            };
            expect( getters.samples( state )).toEqual( state.activeSong.samples );
        });

        it( "should be able to retrieve individual songs by their id", async () => {
            const song = await actions.createSong();
            const state = { songs: [ song ] };
            const retrieved = getters.getSongById( state )( song.id );
            expect( song ).toEqual( retrieved );
        });
    });

    describe( "mutations", () => {
        it( "should be able to toggle the song save message state", () => {
            const state = { showSaveMessage: false };
            mutations.setShowSaveMessage( state, true );
            expect( state.showSaveMessage ).toBe( true );
        });

        it( "should be able to set the samples", () => {
            const state = { activeSong: { samples: [] } };
            const samples = [{ name: "foo" }, { name: "bar" }, { name: "baz" } ];
            mutations.setSamples( state, samples );
            expect( state.activeSong.samples ).toEqual( samples );
        });

        it( "should be able to add a sample to the existing list", () => {
            const state = { activeSong: { samples: [{ name: "foo" }, { name: "bar" }, { name: "baz" } ] } };
            const sample = { name: "qux" };
            mutations.addSample( state, sample );
            expect( state.activeSong.samples ).toEqual(
                [{ name: "foo" }, { name: "bar" }, { name: "baz" }, { name: "qux" } ]
            );
        });

        it( "should be able to flush all currently registered samples", () => {
            const state = { activeSong: { samples: [{ name: "foo" }, { name: "bar" }, { name: "baz" } ]} };
            mutations.flushSamples( state );
            expect( state.activeSong.samples ).toEqual( [] );
        });

        it( "should be able to update a registered sample of the same name as the given sample", () => {
            const state = {
                activeSong: {
                    samples: [
                        { name: "foo", bar: "baz" },
                        { name: "qux", quux: "quuz" },
                        { name: "corge", grault: "garply" }
                    ]
                }
            };
            mutations.updateSample(state, { name: "qux", quux: "waldo" });
            expect( state.activeSong.samples ).toEqual([
                { name: "foo", bar: "baz" }, { name: "qux", quux: "waldo" }, { name: "corge", grault: "garply" }
            ]);
        });
    });

    describe( "actions", () => {
        it( "should be able to open a song", () => {
            const song = { name: "awesomeTune", samples: [{ foo: "bar" }] };
            const commit = jest.fn();
            const dispatch = jest.fn();

            actions.openSong({ commit, dispatch }, song );

            expect( commit ).toHaveBeenNthCalledWith( 1, "setActiveSong", song );
            expect( commit ).toHaveBeenNthCalledWith( 2, "flushSamples" );
            expect( commit ).toHaveBeenNthCalledWith( 3, "setSamples", song.samples );
            expect( dispatch ).toHaveBeenNthCalledWith( 1, "cacheSongSamples", song.samples );
        });

        it( "should be able to create songs", async () => {
            const song = await actions.createSong();
            expect(SongValidator.isValid(song)).toBe(true);

            for (let i = 0; i < 1024; ++i) {
                const compare = await actions.createSong();

                // songs should have unique identifiers
                expect(song.id).not.toEqual(compare.id);
            }
        });

        describe( "when saving songs into local storage", () => {
            const mockedGetters = { t: jest.fn() };
            const dispatch = jest.fn();
            let commit;

            it( "should be able to save songs in storage and show a save message", async () => {
                commit = jest.fn();
                const song = await actions.createSong();
                const state = { songs: [], showSaveMessage: true };

                await actions.saveSongInLS({ state, getters: mockedGetters, commit, dispatch }, song);

                // expected songs meta to have been saved into the song list
                expect(state.songs).toEqual([{
                    id: song.id,
                    meta: song.meta
                }]);
                expect(commit).toHaveBeenNthCalledWith(2, "showNotification", { message: undefined });
            });

            it( "should be able to save songs in storage and suppress the save message when requested", async () => {
                commit = jest.fn();
                const song = await actions.createSong();
                const state = { songs: [], showSaveMessage: false };

                await actions.saveSongInLS({ state, getters: mockedGetters, commit, dispatch }, song);

                expect(commit).not.toHaveBeenNthCalledWith(2, "showNotification");
            });

            it( "should update the modified timestamp when saving a song", async done => {
                commit = jest.fn();
                const song = await actions.createSong();
                const state = { songs: [song] };
                const org = song.meta.modified;

                expect(song.meta.created).toEqual(song.meta.modified);

                setTimeout(async () => {
                    await actions.saveSongInLS({ state, getters: mockedGetters, commit, dispatch }, song);

                    expect(song.meta.created).toEqual(org); // expected creation timestamp to have remained unchanged after saving
                    expect(song.meta.modified).not.toEqual(org); // expected modified timestamp to have updated after saving

                    done();
                }, 1);
            });
        });

        it( "should be able to delete songs from local storage", async () => {
            const song = await actions.createSong();
            const state = { songs: [ song ]};
            await actions.deleteSongFromLS({ state }, { song });

            expect(state.songs).toEqual([]);
        });

        describe( "when importing songs from disk", () => {

        });

        describe( "when exporting songs", () => {
            it( "should serialize the Song as an .XTK file and save it as a file when exporting to disk", async () => {
                mockFn = jest.fn(() => Promise.resolve({}));
                const song = { meta: { title: "foo" } };
                const commit = jest.fn();

                await actions.exportSong({ commit }, song );

                expect( mockFn ).toHaveBeenNthCalledWith( 1, "toXTK", song );
                expect( mockFn ).toHaveBeenNthCalledWith( 2, "saveAsFile", expect.any( Object ), expect.any( String ));
                expect( commit ).toHaveBeenCalledWith( "publishMessage", expect.any( String ));
            });

            it( "should serialize the Song as an .XTK file and store it remotely when exporting to Dropbox", async () => {
                mockFn = jest.fn(() => Promise.resolve({}));
                const song = { meta: { title: "foo" } };
                const commit = jest.fn();

                await actions.exportSongToDropbox({ commit, getters: { t: jest.fn() } }, song );

                expect( mockFn ).toHaveBeenNthCalledWith( 1, "toXTK", song );
                expect( mockFn ).toHaveBeenNthCalledWith( 2, "uploadBlob", expect.any( Object ), expect.any( String ));
                expect( commit ).toHaveBeenCalledWith( "showNotification", expect.any( Object ));

                expect( song.origin ).toEqual( "dropbox" );
            });
        });

        describe( "when calling the SaveSong action", () => {
            it( "should validate the given Song", async () => {
                const dispatch = jest.fn();
                const song = { foo: "bar" };
                await actions.saveSong({ dispatch }, song );
                expect( dispatch ).toHaveBeenNthCalledWith( 1, "validateSong", song );
            });

            it( "should save the song in Local Storage when no origin is specified", async () => {
                const dispatch = jest.fn();
                const song = { foo: "bar" };
                await actions.saveSong({ dispatch }, song );
                expect( dispatch ).toHaveBeenNthCalledWith( 2, "saveSongInLS", song );
            });

            it( "should save the song in Dropbox when the Dropbox origin is specified", async () => {
                const dispatch = jest.fn();
                const song = { foo: "bar", origin: "dropbox" };
                await actions.saveSong({ dispatch }, song );
                expect( dispatch ).toHaveBeenNthCalledWith( 2, "exportSongToDropbox", song );
            });
        });
    });
});
