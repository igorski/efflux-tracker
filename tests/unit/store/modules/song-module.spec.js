import songModule    from '@/store/modules/song-module';
import SongValidator from '@/model/validators/song-validator';

const { getters, mutations, actions } = songModule;

// mock storage

jest.mock('@/utils/storage-util', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
}));

describe('Song module', () => {
    describe('getters', () => {
        it('should be able to retrieve all the songs', () => {
            const state = { songs: [] };
            expect(getters.songs(state)).toEqual(state.songs);
        });

        it('should be able to retrieve the active song', () => {
            const state = { activeSong: {} };
            expect(getters.activeSong(state)).toEqual(state.activeSong);
        });

        it('should be able to retrieve individual songs by their id', async () => {
            const song = await actions.createSong();
            const state = { songs: [ song ] };
            const retrieved = getters.getSongById(state)(song.id);
            expect(song).toEqual(retrieved);
        });
    });

    describe('mutations', () => {
        it('should be able to toggle the song save message state', () => {
            const state = { showSaveMessage: false };
            mutations.setShowSaveMessage(state, true);
            expect(state.showSaveMessage).toBe(true);
        })
    });

    describe('actions', () => {
        it('should be able to create songs', async () => {
            const song = await actions.createSong();
            expect(SongValidator.isValid(song)).toBe(true);

            for (let i = 0; i < 1024; ++i) {
                const compare = await actions.createSong();

                // songs should have unique identifiers
                expect(song.id).not.toEqual(compare.id);
            }
        });

        describe('when saving songs', () => {
            const mockedGetters = { t: jest.fn() };
            const dispatch = jest.fn();
            let commit;

            it('should be able to save songs in storage and show a save message', async () => {
                commit = jest.fn();
                const song = await actions.createSong();
                const state = { songs: [], showSaveMessage: true };

                await actions.saveSong({ state, getters: mockedGetters, commit, dispatch }, song);

                // expected songs meta to have been saved into the song list
                expect(state.songs).toEqual([{
                    id: song.id,
                    meta: song.meta
                }]);
                expect(commit).toHaveBeenNthCalledWith(2, 'showNotification', { message: undefined });
            });

            it('should be able to save songs in storage and suppress the save message when requested', async () => {
                commit = jest.fn();
                const song = await actions.createSong();
                const state = { songs: [], showSaveMessage: false };

                await actions.saveSong({ state, getters: mockedGetters, commit, dispatch }, song);

                expect(commit).not.toHaveBeenNthCalledWith(2, 'showNotification');
            });

            it('should update the modified timestamp when saving a song', async done => {
                commit = jest.fn();
                const song = await actions.createSong();
                const state = { songs: [song] };
                const org = song.meta.modified;

                expect(song.meta.created).toEqual(song.meta.modified);

                setTimeout(async () => {
                    await actions.saveSong({ state, getters: mockedGetters, commit, dispatch }, song);

                    expect(song.meta.created).toEqual(org); // expected creation timestamp to have remained unchanged after saving
                    expect(song.meta.modified).not.toEqual(org); // expected modified timestamp to have updated after saving

                    done();
                }, 1);
            });
        });
    });

    xit('should be able to load songs from storage', async() => {
        const song = await actions.createSong();
        await actions.loadSong({}, song);
    });

    it('should be able to delete songs from storage', async () => {
        const song = await actions.createSong();
        const state = { songs: [ song ]};
        await actions.deleteSong({ state }, { song });

        expect(state.songs).toEqual([]);
    });
});
