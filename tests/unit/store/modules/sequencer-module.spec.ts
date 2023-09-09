import { describe, it, expect, beforeAll } from "vitest";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import type { EffluxSong } from "@/model/types/song";
import SequencerModule, { createSequencerState, type SequencerState } from "@/store/modules/sequencer-module";

const { getters, mutations } = SequencerModule;

describe( "Vuex sequencer module", () => {
    let state: SequencerState;
    let activeSong: EffluxSong;

    describe( "getters", () => {
        it( "should be able to retrieve the active playing state", () => {
            state = createSequencerState({ playing: true });
            expect( getters.isPlaying( state )).toEqual( true );
        });

        it( "should be able to retrieve the active looping state", () => {
            state = createSequencerState({ looping: true });
            expect( getters.isLooping( state )).toEqual( true );
        });

        it( "should be able to retrieve the active recording state", () => {
            state = createSequencerState({ recording: true });
            expect( getters.isRecording( state )).toEqual( true );
        });

        describe( "when deriving the active pattern from the active order index", () => {
            beforeAll(() => {
                activeSong = SongFactory.create();
                activeSong.patterns = [
                    PatternFactory.create( 16 ), PatternFactory.create( 8 ), PatternFactory.create( 4 ) 
                ];
                activeSong.order = [ 0, 0, 1, 2 ];
                state = createSequencerState({ activeOrderIndex: 2 });
            });

            it( "should be able to retrieve the active pattern", () => {
                const rootGetters = { activeSong };
 
                expect( getters.activePattern( state, rootGetters )).toEqual( 1 );
            });

            it( "should be able to retrieve the amount of steps for the active pattern", () => {
                const rootGetters = { activeSong, activePattern: 1 };

                expect( getters.amountOfSteps( state, rootGetters )).toEqual( 8 );
            });
        });
    });
});