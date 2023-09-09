import { describe, it, expect, afterEach, beforeAll, beforeEach, vi, Mock } from "vitest";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import type { EffluxSong } from "@/model/types/song";
import SequencerModule, { createSequencerState, type SequencerState } from "@/store/modules/sequencer-module";
import LinkedList from "@/utils/linked-list";
import { mockAudioContext, createMockOscillatorNode } from "../../mocks";

const mockSequencerWorker = {
    postMessage: vi.fn(),
};
vi.mock( "@/workers/sequencer.worker?worker&inline", () => ({
    default: function() {
        return mockSequencerWorker
    }
}));

var mockAudioServicePlaybackToggle = vi.fn(); // var to allow hoisting
vi.mock( "@/services/audio-service", () => ({
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    getAudioContext: () => mockAudioContext,
    isRecording: vi.fn(),
    togglePlayback: vi.fn( value => mockAudioServicePlaybackToggle( value )),
}));

describe( "Vuex sequencer module", () => {
    const { getters, mutations, actions } = SequencerModule;

    let state: SequencerState;
    let activeSong: EffluxSong;

    afterEach(() => {
        vi.restoreAllMocks();
    });

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

    describe( "mutations", () => {
        describe( "when setting the playback state", () => {
            const prepare = async ( state: SequencerState ): Promise<SequencerState> => {
                await actions.prepareSequencer({ state });
                return state;
            }

            it( "should not do anything when reassigning the current state", () => {
                state = createSequencerState({ playing: false });

                mutations.setPlaying( state, false );
                expect( mockAudioServicePlaybackToggle ).not.toHaveBeenCalled();

                state.playing = true;

                mutations.setPlaying( state, true );
                expect( mockAudioServicePlaybackToggle ).not.toHaveBeenCalled();
            });

            describe( "and playback is started", () => {
                beforeEach( async () => {
                    state = await prepare( createSequencerState({ playing: false }));
                });

                it( "should start the scheduler inside the Worker when playback starts", () => {
                    const workerSpy = vi.spyOn( mockSequencerWorker, "postMessage" );
         
                    mutations.setPlaying( state, true );

                    expect( workerSpy ).toHaveBeenCalledOnce();
                    expect( workerSpy ).toHaveBeenCalledWith({ cmd: "start", interval: expect.any( Number ) });
                });

                it( "should activate playback inside the AudioService", () => {
                    mutations.setPlaying( state, true );

                    expect( mockAudioServicePlaybackToggle ).toHaveBeenCalledWith( true );
                });

                it( "should set the currentStep to the first step", () => {
                    state.currentStep = 4;

                    mutations.setPlaying( state, true );

                    expect( state.currentStep ).toEqual( 0 );
                });
            });
            
            describe( "and playback is stopped", () => {
                const list1 = new LinkedList();
                const list2 = new LinkedList();

                beforeEach( async () => {
                    state = await prepare( createSequencerState({ playing: true, channelQueue: [ list1, list2 ] }));
                });

                it( "should stop the scheduler inside the Worker", () => {
                    const workerSpy = vi.spyOn( mockSequencerWorker, "postMessage" );
             
                    mutations.setPlaying( state, false );
    
                    expect( workerSpy ).toHaveBeenCalledOnce();
                    expect( workerSpy ).toHaveBeenCalledWith({ cmd: "stop" });
                });

                it( "should deactivate playback inside the AudioService", () => {
                    mutations.setPlaying( state, false );

                    expect( mockAudioServicePlaybackToggle ).toHaveBeenCalledWith( false );
                });

                it( "should clear all pending timer queue handlers", () => {
                    const timer1 = createMockOscillatorNode();
                    const timer2 = createMockOscillatorNode();

                    const timer1StopSpy = vi.spyOn( timer1, "disconnect" );
                    const timer2StopSpy = vi.spyOn( timer2, "disconnect" );

                    state.queueHandlers = [ timer1, timer2 ];

                    mutations.setPlaying( state, false );

                    expect( timer1StopSpy ).toHaveBeenCalledOnce();
                    expect( timer2StopSpy ).toHaveBeenCalledOnce();
                });

                it( "should flush the channel queue lists", () => {
                    const list1FlushSpy = vi.spyOn( list1, "flush" );
                    const list2FlushSpy = vi.spyOn( list2, "flush" );

                    mutations.setPlaying( state, false );

                    expect( list1FlushSpy ).toHaveBeenCalledOnce();
                    expect( list2FlushSpy ).toHaveBeenCalledOnce();
                });
            });
        });

        it( "should be able to set the looping state", () => {
            const state = createSequencerState({ looping: false });
            mutations.setLooping( state, true );

            expect( state.looping ).toEqual( true );
        });

        it( "should be able to set the recording state", () => {
            const state = createSequencerState({ recording: false });
            mutations.setRecording( state, true );

            expect( state.recording ).toEqual( true );
        });

        it( "should be able to set the active order index", () => {
            const state = createSequencerState({ activeOrderIndex: 5 });
            mutations.setActiveOrderIndex( state, 7 );

            expect( state.activeOrderIndex ).toEqual( 7 );
        });

        describe( "when navigating to the previous pattern inside the song pattern order list", () => {
            beforeAll(() => {
                activeSong = SongFactory.create();
            });

            it( "should be able to navigate to the previous index when the current index is a positive value", () => {
                const state = createSequencerState({ activeOrderIndex: 4, currentStep: 14 });
                mutations.gotoPreviousPattern( state, activeSong );

                expect( state.activeOrderIndex ).toEqual( 3 );
            });

            it( "should reset the current step to the first index when the current step is a positive value", () => {
                const state = createSequencerState({ activeOrderIndex: 4, currentStep: 14 });
                mutations.gotoPreviousPattern( state, activeSong );

                expect( state.currentStep ).toEqual( 0 );
            });

            it( "should not navigate to a negative index when the current index is 0", () => {
                const state = createSequencerState({ activeOrderIndex: 0, currentStep: 14 });
                mutations.gotoPreviousPattern( state, activeSong );

                expect( state.activeOrderIndex ).toEqual( 0 );
            });
        });

        describe( "when navigating to the next pattern inside the song pattern order list", () => {
            beforeAll(() => {
                activeSong = SongFactory.create();
                activeSong.order = [ 0, 0, 1, 2 ];
            });

            it( "should be able to navigate to the previous index when the current index is a positive value", () => {
                const state = createSequencerState({ activeOrderIndex: 2, currentStep: 14 });
                mutations.gotoNextPattern( state, activeSong );

                expect( state.activeOrderIndex ).toEqual( 3 );
            });

            it( "should reset the current step to the first index when the current step is a positive value", () => {
                const state = createSequencerState({ activeOrderIndex: 2, currentStep: 14 });
                mutations.gotoNextPattern( state, activeSong );

                expect( state.currentStep ).toEqual( 0 );
            });

            it( "should not navigate to an index larger than the song order list size when the current index is at the end of the list", () => {
                const state = createSequencerState({ activeOrderIndex: 3, currentStep: 14 });
                mutations.gotoNextPattern( state, activeSong );

                expect( state.activeOrderIndex ).toEqual( 3 );
            });
        });

        it( "should be able to set the current step", () => {
            const state = createSequencerState({ currentStep: 3 });
            mutations.setCurrentStep( state, 4 );

            expect( state.currentStep ).toEqual( 4 );
        });

        describe( "when setting the sequencer position", () => {
            beforeEach(() => {
                state = createSequencerState({ activeOrderIndex: 2, currentStep: 6 });
                
                activeSong = SongFactory.create();
                activeSong.patterns = [
                    PatternFactory.create( 16 ), PatternFactory.create( 8 ), PatternFactory.create( 4 ) 
                ];
                activeSong.order = [ 0, 0, 1, 1, 2 ];
            });

            it( "should update the active order index to match given order index", () => {
                mutations.setPosition( state, { activeSong, orderIndex: 3 });
                expect( state.activeOrderIndex ).toEqual( 3 );
            });

            it( "should clamp to the last pattern in the order list when given orderIndex exceeds the order list bounds", () => {
                mutations.setPosition( state, { activeSong, orderIndex: 5 });
                expect( state.activeOrderIndex ).toEqual( 4 );
            });

            it( "should set the current step value to 0 when changing pattern", () => {
                mutations.setPosition( state, { activeSong, orderIndex: 3 });
                expect( state.currentStep ).toEqual( 0 );
            });

            it( "should update the scheduled next note times to given currentTime value", () => {
                mutations.setPosition( state, { activeSong, orderIndex: 3, currentTime: 12 });

                expect( state.nextNoteTime ).toEqual( 12 );
                expect( state.measureStartTime ).toEqual( 12 );
            });

            it( "should default to using the AudioContext currenttime value when no currentTime was provided", () => {
                mockAudioContext.currentTime = 7;
                mutations.setPosition( state, { activeSong, orderIndex: 3 });

                expect( state.nextNoteTime ).toEqual( 7 );
                expect( state.measureStartTime ).toEqual( 7 );
            });

            it( "should update the cached state channels to reflect the channels of the currently active pattern", () => {
                mutations.setPosition( state, { activeSong, orderIndex: 3 });

                expect( state.channels ).toEqual( activeSong.patterns[ 1 ].channels );
            });
        });
    });
});