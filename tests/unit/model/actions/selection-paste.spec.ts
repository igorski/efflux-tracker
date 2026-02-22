import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import pasteSelection from "@/model/actions/selection-paste";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxSong } from "@/model/types/song";
import { type EditorState } from "@/store/modules/editor-module";
import { type SelectionState } from "@/store/modules/selection-module";
import { clonePattern } from "@/utils/pattern-util";
import { createMockStore } from "../../mocks";

describe( "Selection paste action", () => {
    const AMOUNT_OF_INSTRUMENTS = 4;
    const activePatternIndex = 2;

    const store = createMockStore();
    let editor: EditorState;
    let selection: SelectionState;
    let song: EffluxSong;

    beforeEach(() => {
        song = SongFactory.create( AMOUNT_OF_INSTRUMENTS );

        for ( let i = 1; i < 4; ++i ) {
            song.patterns.push( PatternFactory.create());
        }
        store.state.song.activeSong = song;

        store.getters.activePatternIndex = activePatternIndex;

        ({ editor } = store.state );

        editor.selectedInstrument = 2;
        editor.selectedStep = 4;

        ({ selection } = store.state );

        selection.firstSelectedChannel = 2;
        selection.lastSelectedChannel = AMOUNT_OF_INSTRUMENTS - 1;
        selection.minSelectedStep = 8;
        selection.maxSelectedStep = 14;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should call the selection paste action with the appropriate values", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        pasteSelection( store );

        expect( commitSpy ).toHaveBeenCalledWith( "pasteSelection", {
            song, activePattern: activePatternIndex, selectedInstrument: editor.selectedInstrument, selectedStep: editor.selectedStep,
        });
    });

    it( "should invalidate the songs channel cache", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        pasteSelection( store );

        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });

    describe( "on undo", () => {
        it( "should restore the original pattern appropriately", () => {
            const originalPattern = clonePattern( song, activePatternIndex );
            const { undo } = pasteSelection( store );

            undo();

            expect( song.patterns[ activePatternIndex ]).toEqual( originalPattern );
        });

        it( "should restore the editor state appropriately", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            const { undo } = pasteSelection( store );

            vi.clearAllMocks();
            undo();

            expect( commitSpy ).toHaveBeenCalledWith( "setMinSelectedStep", selection.minSelectedStep );
            expect( commitSpy ).toHaveBeenCalledWith( "setMaxSelectedStep", selection.maxSelectedStep );
            expect( commitSpy ).toHaveBeenCalledWith( "setSelectionChannelRange", {
                firstChannel: selection.firstSelectedChannel, lastChannel: selection.lastSelectedChannel
            });
        });

        it( "should invalidate the songs channel cache", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            const { undo } = pasteSelection( store );

            vi.clearAllMocks();
            undo();

            expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
        });
    });
});
