import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateTempo } from "@/model/actions/tempo-update";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxSong } from "@/model/types/song";
import { clone } from "@/utils/object-util";
import { createMockStore } from "../../mocks";

const mockUpdateEventOffsets = vi.fn();
vi.mock( "@/utils/song-util", () => ({
    updateEventOffsets: vi.fn(( ...args ) => mockUpdateEventOffsets( ...args )),
}));

const mockApplyModules = vi.fn();
vi.mock( "@/services/audio-service", () => ({
    applyModule: vi.fn(( ...args ) => mockApplyModules( ...args )),
}))

describe( "Tempo update action", () => {
    const AMOUNT_OF_INSTRUMENTS = 2;
    const ORIGINAL_TEMPO = 120;

    const store = createMockStore();
    let song: EffluxSong;

    beforeEach(() => {
        song = SongFactory.create( AMOUNT_OF_INSTRUMENTS );
        song.meta.timing.tempo = ORIGINAL_TEMPO;
        store.state.song.activeSong = song;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe( "when applying a tempo update", () => {
        it( "should update the active songs timing meta", () => {
            updateTempo( store, 130 );

            expect( store.commit ).toHaveBeenCalledWith( "setTempo", 130 );
        });

        it( "should update the position offsets for all the songs events", () => {
            updateTempo( store, 130 );

            expect( mockUpdateEventOffsets ).toHaveBeenCalledWith( song.patterns, ( ORIGINAL_TEMPO / 130 ));
        });

        describe( "and synchronising the intervals of synced instrument modules", () => {
            it( "should not adjust delay times of unsynced delay modules", () => {
                for ( const instrument of song.instruments ) {
                    instrument.delay.sync = false;
                }
                updateTempo( store, 240 );

                expect( store.commit ).not.toHaveBeenCalledWith( "updateInstrument", expect.any( Object ));
            });

            it( "should adjust the delay times of synced delay modules", () => {
                for ( const instrument of song.instruments ) {
                    instrument.delay.sync = true;
                }
                const originalDelays = song.instruments.map( instrument => clone( instrument.delay ));
                
                updateTempo( store, 240 );

                for ( let i = 0; i < originalDelays.length; ++i ) {
                    const newDelayProps = {
                        ...originalDelays[ i ],
                        time: originalDelays[ i ].time * ( ORIGINAL_TEMPO / 240 ),
                    };

                    expect( mockApplyModules ).toHaveBeenNthCalledWith( 1 + i, "delay", i, newDelayProps );

                    expect( store.commit ).toHaveBeenNthCalledWith( 2 + i, "updateInstrument", {
                        instrumentIndex: i,
                        prop: "delay",
                        value: newDelayProps,
                    });
                }
            });
        });
    });

    describe( "when restoring a tempo update to the previous value", () => {
        it( "should restore the position offsets for all the songs events", () => {
            const { undo } = updateTempo( store, 130 );

            undo();

            expect( store.commit ).toHaveBeenNthCalledWith( 2, "setTempo", ORIGINAL_TEMPO );
        });

        it( "should update the position offsets for all the songs events", () => {
            const { undo } = updateTempo( store, 130 );

            undo();

            expect( mockUpdateEventOffsets ).toHaveBeenNthCalledWith( 2, song.patterns, ( 130 / ORIGINAL_TEMPO ));
        });

        describe( "and synchronising the intervals of synced instrument modules", () => {
            it( "should not adjust delay times of unsynced delay modules", () => {
                for ( const instrument of song.instruments ) {
                    instrument.delay.sync = false;
                }
                const { undo } = updateTempo( store, 240 );

                undo();

                expect( store.commit ).not.toHaveBeenCalledWith( "updateInstrument", expect.any( Object ));
            });

            it( "should restore the delay times of synced delay modules", () => {
                for ( const instrument of song.instruments ) {
                    instrument.delay.sync = true;
                }
                const originalDelays = song.instruments.map( instrument => clone( instrument.delay ));
                
                const { undo } = updateTempo( store, 240 );

                song.instruments.forEach( instrument => {
                    instrument.delay.time /= ( 240 / ORIGINAL_TEMPO ); // update the delay times (not set due to mocked store mutation)
                });
                
                undo();

                for ( let i = 0; i < originalDelays.length; ++i ) {
                    expect( mockApplyModules ).toHaveBeenNthCalledWith( 1 + AMOUNT_OF_INSTRUMENTS + i, "delay", i, originalDelays[ i ] );

                    expect( store.commit ).toHaveBeenNthCalledWith( 3 + AMOUNT_OF_INSTRUMENTS + i, "updateInstrument", {
                        instrumentIndex: i,
                        prop: "delay",
                        value: originalDelays[ i ],
                    });
                }
            });
        });
    });
});