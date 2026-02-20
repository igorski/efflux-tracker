import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import updatePatternOrder from "@/model/actions/pattern-update-order";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxSong } from "@/model/types/song";
import { createMockStore } from "../../mocks";

describe( "Update pattern order action", () => {
    const AMOUNT_OF_INSTRUMENTS = 4;

    const store = createMockStore();
    let song: EffluxSong;

    beforeEach(() => {
        song = SongFactory.create( AMOUNT_OF_INSTRUMENTS );
        store.state.song.activeSong = song;

        song.order = [ 0, 1, 1, 2, 3 ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should be able to update the songs order with the provided new order", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        const newOrder = [ 3, 1, 1, 2, 0, 1 ];
        updatePatternOrder( store, newOrder );

        expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", newOrder );
    });

    it( "should restore the original values appropriately on undo", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        const originalOrder = [ ...song.order ];

        const { undo } = updatePatternOrder( store, [ 3, 1, 1, 2, 0, 1 ] );

        vi.clearAllMocks();
        undo();

        expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", originalOrder );
    });
});
