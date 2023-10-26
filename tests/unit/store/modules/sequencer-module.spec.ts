import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { ACTION_NOTE_ON, type EffluxAudioEvent } from "@/model/types/audio-event";
import RootStore from "@/store";
import SequencerModule, { createSequencerState, type SequencerState } from "@/store/modules/sequencer-module";
import EventUtil from "@/utils/event-util";
import LinkedList from "@/utils/linked-list";
import { mockAudioContext, createMockOscillatorNode } from "../../mocks";

const mockSequencerWorker = {
    postMessage: vi.fn(),
    onmessage: vi.fn(),
};
vi.mock( "@/workers/sequencer.worker?worker&inline", () => ({
    default: function() {
        return mockSequencerWorker
    }
}));

const mockAudioServiceNoteOn = vi.fn();
const mockAudioServiceNoteOff = vi.fn();
const mockAudioServicePlaybackToggle = vi.fn();
const mockAudioServiceIsRecording = vi.fn();
vi.mock( "@/services/audio-service", () => ({
    noteOn: vi.fn(( ...args ) => mockAudioServiceNoteOn( ...args )),
    noteOff: vi.fn(( ...args ) => mockAudioServiceNoteOff( ...args )),
    getAudioContext: () => mockAudioContext,
    isRecording: vi.fn( value => mockAudioServiceIsRecording( value )),
    togglePlayback: vi.fn( value => mockAudioServicePlaybackToggle( value )),
}));

const mockGetEventLength = vi.fn(); // var to allow hoisting
vi.mock( "@/utils/event-util", async () => ({
    ...( await vi.importActual( "@/utils/event-util" ) as object ),
    getEventLength: vi.fn(( ...args ) => mockGetEventLength( ...args )),
}));

const mockCreateTimer = vi.fn();
vi.mock( "@/services/audio/webaudio-helper", () => ({
    createTimer: vi.fn(( ...args ) => mockCreateTimer( ...args )),
}));

describe( "Vuex sequencer module", () => {
    const { getters, mutations, actions } = SequencerModule;

    let state: SequencerState;
    
    const activeSong = SongFactory.create();
    activeSong.order = [ 0, 0, 1, 1, 2 ];

    beforeEach(() => {
        vi.useFakeTimers()
        activeSong.patterns = [
            PatternFactory.create( 16 ), PatternFactory.create( 8 ), PatternFactory.create( 4 ) 
        ];
        mockAudioContext.currentTime = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
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

        it( "should be able to retrieve the active order index", () => {
            state = createSequencerState({ activeOrderIndex: 6 });
            expect( getters.activeOrderIndex( state )).toEqual( 6 );
        });

        it( "should be able to retrieve the active pattern index", () => {
            state = createSequencerState({ activePatternIndex: 5 });
            expect( getters.activePatternIndex( state )).toEqual( 5 );
        });

        it( "should be able to retrieve the amount of steps for the active pattern", () => {
            state = createSequencerState({ activePatternIndex: 1 });
            const rootGetters = { activeSong };

            expect( getters.amountOfSteps( state, rootGetters )).toEqual( 8 );
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

        it( "should be able to set the active pattern index", () => {
            const state = createSequencerState({ activePatternIndex: 3 });
            mutations.setActivePatternIndex( state, 4 );

            expect( state.activePatternIndex ).toEqual( 4 );
        });

        describe( "when navigating to the previous pattern inside the song pattern order list", () => {
            it( "should be able to navigate to the previous index when the current index is a positive value", () => {
                const state = createSequencerState({ activeOrderIndex: 4, currentStep: 14 });
                mutations.gotoPreviousPattern( state, activeSong );

                expect( state.activeOrderIndex ).toEqual( 3 );
                expect( state.activePatternIndex ).toEqual( 1 );
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
                expect( state.activePatternIndex ).toEqual( 0 );
            });
        });

        it( "should be able to navigate to given pattern inside the song pattern order list", () => {
            const state = createSequencerState({ activeOrderIndex: 3, currentStep: 14 });

            mutations.gotoPattern( state, { orderIndex: 4, song: activeSong });

            expect( state.activeOrderIndex ).toEqual( 4 );
            expect( state.activePatternIndex ).toEqual( 2 );
        });

        describe( "when navigating to the next pattern inside the song pattern order list", () => {
            it( "should be able to navigate to the next index when the current index is below the end of the list", () => {
                const state = createSequencerState({ activeOrderIndex: 3, currentStep: 14 });
                mutations.gotoNextPattern( state, activeSong );

                expect( state.activeOrderIndex ).toEqual( 4 );
                expect( state.activePatternIndex ).toEqual( 2 );
            });

            it( "should reset the current step to the first index when the current step is a positive value", () => {
                const state = createSequencerState({ activeOrderIndex: 2, currentStep: 14 });
                mutations.gotoNextPattern( state, activeSong );

                expect( state.currentStep ).toEqual( 0 );
            });

            it( "should not navigate to an index larger than the song order list size when the current index is at the end of the list", () => {
                const state = createSequencerState({ activeOrderIndex: 4, activePatternIndex: 2, currentStep: 14 });
                mutations.gotoNextPattern( state, activeSong );

                expect( state.activeOrderIndex ).toEqual( 4 );
                expect( state.activePatternIndex ).toEqual( 2 );
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
            });

            it( "should update the active order index to match given order index", () => {
                mutations.setPosition( state, { activeSong, orderIndex: 3 });
                expect( state.activeOrderIndex ).toEqual( 3 );
            });

            it( "should update the active pattern index to match given order index", () => {
                mutations.setPosition( state, { activeSong, orderIndex: 3 });
                expect( state.activePatternIndex ).toEqual( 1 );
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

            it( "should cache the event lengths for all events in the newly set active pattern", () => {
                const event1 = EventFactory.create( 0, "C", 3, ACTION_NOTE_ON );
                const event2 = EventFactory.create( 0, "C", 4, ACTION_NOTE_ON );
                const event3 = EventFactory.create( 1, "C", 5, ACTION_NOTE_ON );

                const orderIndex = 3;
                activeSong.patterns[ activeSong.order[ orderIndex ]].channels = [
                    [ event1, undefined, event2, undefined ],
                    [ undefined, undefined, event3, undefined ],
                ];
                mutations.setPosition( state, { activeSong, orderIndex });

                expect( mockGetEventLength ).toHaveBeenNthCalledWith( 1, event1, 0, orderIndex, activeSong );
                expect( mockGetEventLength ).toHaveBeenNthCalledWith( 2, event2, 0, orderIndex, activeSong );
                expect( mockGetEventLength ).toHaveBeenNthCalledWith( 3, event3, 1, orderIndex, activeSong );
            });

            it( "should not cache the event lengths for all events in the same (non-changed) active pattern", () => {
                const event1 = EventFactory.create( 0, "C", 3, ACTION_NOTE_ON );

                const orderIndex = state.activeOrderIndex;
                activeSong.patterns[ activeSong.order[ orderIndex ]].channels = [
                    [ event1 ],
                    [ undefined ],
                ];
                mutations.setPosition( state, { activeSong, orderIndex });

                expect( mockGetEventLength ).not.toHaveBeenCalled();
            });
        });

        describe( "when handling a request to invalidate the channel cache", () => {
            let event1: EffluxAudioEvent;
            let event2: EffluxAudioEvent;
            let event3: EffluxAudioEvent;

            beforeEach(() => {
                state = createSequencerState({
                    activeOrderIndex: 2,
                    activePatternIndex: activeSong.order[ 2 ],
                    currentStep: 6,
                    playing: true
                });
                event1 = EventFactory.create( 0, "C", 3, ACTION_NOTE_ON );
                event2 = EventFactory.create( 1, "C", 4, ACTION_NOTE_ON );
                event3 = EventFactory.create( 0, "C", 5, ACTION_NOTE_ON );

                activeSong.patterns[ 0 ].channels = [
                    [ event3, undefined, undefined, undefined ],
                    [ undefined, undefined, undefined, undefined ],
                ];
                activeSong.patterns[ state.activePatternIndex ].channels = [
                    [ event1, undefined, undefined, undefined ],
                    [ undefined, undefined, event2, undefined ],
                ];
            });

            it( "should not do anything when the sequencer isn't playing", () => {
                state.playing = false;
                mutations.invalidateChannelCache( state, { song: activeSong });
                expect( mockGetEventLength ).not.toHaveBeenCalled();
            });

            it( "should not do anything when provided orderIndex is different to the currently activeOrderIndex", () => {
                mutations.invalidateChannelCache( state, { song: activeSong, orderIndex: 3 });
                expect( mockGetEventLength ).not.toHaveBeenCalled();
            });

            it( "should default to using the currently activeOrderIndex when an index was not provided and cache the events in the currently active pattern", () => {
                mutations.invalidateChannelCache( state, { song: activeSong });

                expect( mockGetEventLength ).toHaveBeenCalledTimes( 2 );
                expect( mockGetEventLength ).toHaveBeenNthCalledWith( 1, event1, 0, state.activeOrderIndex, activeSong );
                expect( mockGetEventLength ).toHaveBeenNthCalledWith( 2, event2, 1, state.activeOrderIndex, activeSong );
            });

            it( "should cache a reference to the currently active patterns channels", () => {
                expect( state.channels ).toBeUndefined();

                mutations.invalidateChannelCache( state, { song: activeSong });

                expect( state.channels ).toEqual( activeSong.patterns[ state.activePatternIndex ].channels );
            });
        });
    });

    describe( "when tracking state updates from the SequencerWorker", () => {
        const orderIndex = 1;
        const patternIndex = activeSong.order[ orderIndex ];
        const measureDuration = ( 60 / activeSong.meta.tempo ) * 4;

        let rootStore;
        let state: SequencerState;
        let event1: EffluxAudioEvent;
        let event2: EffluxAudioEvent;

        const commit = vi.fn();

        function createEvent( note: string, stepIndex: number, patternIndex: number, channelIndex: number ): EffluxAudioEvent {
            const event   = EventFactory.create( 0, note, 3, ACTION_NOTE_ON );
            const pattern = activeSong.patterns[ patternIndex ];

            pattern.channels[ channelIndex ][ stepIndex ] = event;
            EventUtil.setPosition( event, pattern, pattern.channels[ channelIndex ].indexOf( event ), activeSong.meta.tempo );
            
            return event;
        }

        beforeEach( async () => {
            state = createSequencerState({ playing: true, activeOrderIndex: 0 });
            rootStore = { ...RootStore, commit, getters: {
                sampleCache: {},
                get activePatternIndex() {
                    return getters.activePatternIndex( state );
                }
            } };
            rootStore.state.sequencer = state;
            rootStore.state.song = { activeSong };

            event1 = createEvent( "C", 7, patternIndex, 0 );
            event2 = createEvent( "D", 1, patternIndex, 1 );

            mockGetEventLength.mockImplementation(() => 1 );
            mutations.setPosition( state, { activeSong, orderIndex });

            await actions.prepareSequencer({ state }, rootStore );
        });

        it( "should step the lookahead range", () => {
            mockSequencerWorker.onmessage({ data: { cmd: "collect" }});

            expect( commit ).toHaveBeenCalledWith( "setCurrentStep", 1 );
        });

        it( "should increment the nextNoteTime when stepping the lookahead range", () => {
            let amountStepped = 0;
            commit.mockImplementation( cmd => {
                if ( cmd === "setCurrentStep" ) {
                    ++amountStepped;
                }
            });
            mockSequencerWorker.onmessage({ data: { cmd: "collect" }});

            expect( state.nextNoteTime ).toEqual(( measureDuration / state.stepPrecision ) * amountStepped );
        });

        it( "should ignore events that are not within the current lookahead range", () => {
            mockSequencerWorker.onmessage({ data: { cmd: "collect" }});

            expect( event1.seq.playing ).toBe( false );
        });
        
        it( "should schedule events within the current lookahead range for playing and set their startMeasure index", () => {
            mockSequencerWorker.onmessage({ data: { cmd: "collect" }});

            expect( event2.seq.playing ).toBe( true );
            expect( event2.seq.startMeasure ).toBe( 1 );
        });

        it( "should trigger the noteOn-method inside the AudioService, passing the scheduled event, instrument, songs sample Map and scheduled playback time", () => {
            const patternSteps  = activeSong.patterns[ patternIndex ].channels[ 1 ].length;
            // the expected scheduled playback time of the noteOn-invocation asserts that the collect method
            // has iterated the sequencer steps in increments until finding the event to be in range
            const expectedSteps = ( state.stepPrecision / patternSteps );

            mockSequencerWorker.onmessage({ data: { cmd: "collect" }});

            expect( mockAudioServiceNoteOn ).toHaveBeenCalledOnce();
            expect( mockAudioServiceNoteOn ).toHaveBeenCalledWith(
                event2,
                activeSong.instruments[ event2.instrument ],
                rootStore.getters.sampleCache,
                ( measureDuration / state.stepPrecision ) * expectedSteps,
            );
            expect( mockAudioServiceNoteOff ).not.toHaveBeenCalled();
        });

        it( "should halt playback of the previously playing event for newly scheduled noteOn events", async () => {
            const patternSteps  = activeSong.patterns[ patternIndex ].channels[ 1 ].length;
            const expectedSteps = ( state.stepPrecision / patternSteps );

            // this event will precede event 2 in playback as it appears at the first step in the pattern
            const event3 = createEvent( "F", 0, patternIndex, 1 );
            event3.seq.length = 0.1;

            let scheduledOffTime = 0;
            mockCreateTimer.mockImplementationOnce(( ctx, time, cb ) => {
                scheduledOffTime = time;
                setTimeout( cb, time ); // resolves to call noteOff
                return { disconnect: vi.fn() } as unknown as OscillatorNode
            });

            // generate an id for the event on noteOn phase
            let CREATED_EVENTS = 0;
            mockAudioServiceNoteOn.mockImplementation( event => {
                event.id = ++CREATED_EVENTS;
            });
            mockSequencerWorker.onmessage({ data: { cmd: "collect" }});

            await vi.runAllTimersAsync();

            // assert event3 is scheduled first
            expect( mockAudioServiceNoteOn ).toHaveBeenNthCalledWith( 1, event3, expect.any( Object ), expect.any( Object ), expect.any( Number ));
            // assert event2 is scheduled second
            expect( mockAudioServiceNoteOn ).toHaveBeenNthCalledWith( 2, event2, expect.any( Object ), expect.any( Object ), expect.any( Number ));
           
            // assert even3 has been unscheduled at the right time
            expect( scheduledOffTime ).toEqual(( measureDuration / state.stepPrecision ) * expectedSteps );
            expect( mockAudioServiceNoteOff ).toHaveBeenCalledWith( event3 );
        });
        
        it( "should calculate the scheduled events module parameter automation duration to be one pattern step in duration", () => {
            mockSequencerWorker.onmessage({ data: { cmd: "collect" }});

            expect( event2.seq.mpLength ).toEqual( measureDuration / activeSong.patterns[ patternIndex ].steps );
        });

        describe( "when collecting for the last step in the current pattern", () => {
            beforeEach(() => {
                state.stepPrecision = 1; // just so a single collect-step advances pattern
            });

            it( "should restore the current step value to 0 for the next collect cycles", () => {
                mockSequencerWorker.onmessage({ data: { cmd: "collect" }});
    
                expect( commit ).toHaveBeenCalledWith( "setCurrentStep", 0 );
            });

            it( "should step to the next pattern inside the song order list when looping is disabled", () => {     
                mockSequencerWorker.onmessage({ data: { cmd: "collect" }});
    
                expect( commit ).toHaveBeenCalledWith( "gotoNextPattern", activeSong );
                expect( commit ).not.toHaveBeenCalledWith(" gotoPattern", expect.any( Object ));
            });
    
            it( "should not step to the next pattern inside the song order list when looping is enabled", () => {
                state.looping = true;
     
                mockSequencerWorker.onmessage({ data: { cmd: "collect" }});
    
                expect( commit ).not.toHaveBeenCalledWith( "gotoNextPattern", activeSong );
                expect( commit ).not.toHaveBeenCalledWith( "gotoPattern", expect.any( Object ));
            });
    
            it( "should step to the first pattern in the song order list when the last pattern inside the order list has finished playing", () => {
                state.activeOrderIndex = activeSong.order.length - 1;
    
                mockSequencerWorker.onmessage({ data: { cmd: "collect" }});
    
                expect( commit ).toHaveBeenCalledWith( "setCurrentStep", 0 );
                expect( commit ).toHaveBeenCalledWith( "gotoPattern", { orderIndex: 0, song: activeSong });
                expect( commit ).not.toHaveBeenCalledWith( "gotoNextPattern", expect.any( Object ));
            });
    
            it( "should stop recording when the last pattern in the song order list has finished playing", () => {
                state.activeOrderIndex = activeSong.order.length - 1;
                
                mockAudioServiceIsRecording.mockImplementation(() => true );
    
                mockSequencerWorker.onmessage({ data: { cmd: "collect" }});
    
                expect( commit ).toHaveBeenCalledWith( "setPlaying", false );
            });
        });
    })
});