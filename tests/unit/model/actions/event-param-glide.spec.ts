import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Store } from "vuex";
import glideParameterAutomations, { glideModuleParams } from "@/model/actions/event-param-glide";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxAudioEvent } from "@/model/types/audio-event";
import { type EffluxChannel } from "@/model/types/channel";
import { type EffluxSong } from "@/model/types/song";
import { type EffluxState } from "@/store";
import { createAndInsertEvent } from "../../helpers";
import { createMockStore } from "../../mocks";

describe( "event parameter glide action", () => {
    let song: EffluxSong;
    let store: Store<EffluxState>;
    let channel: EffluxChannel; 

    const orderIndex = 0;
    const channelIndex = 0;
    let patternIndex: number;

    function createEvent( step: number, mpValue: number, glide = false ): EffluxAudioEvent {
        const event = createAndInsertEvent( step, song, patternIndex, channelIndex );
        event.mp = {
            module: "foo",
            value: mpValue,
            glide,
        };
        return event;
    }

    beforeEach(() => {
        store = createMockStore();
        song = SongFactory.create( 8 );
        
        patternIndex = song.order[ orderIndex ];

        song.patterns[ patternIndex ] = PatternFactory.create( 8 );
        channel = song.patterns[ patternIndex ].channels[ channelIndex ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should not do anything if there is only one event in the channel", () => {
        const step = 2;
        const event = createEvent( step, 0 );
        
        glideParameterAutomations( song, step, orderIndex, channelIndex, store );

        expect( channel ).toEqual([ 0, 0, event, 0, 0, 0, 0, 0 ]);

        expect( event.mp ).toEqual({
            module: "foo",
            value: 0,
            glide: false,
        });
    });

    it( "should not do anything if two adjacent events are for different module params", () => {
        const step = 2;
        const dist = 2;
        const event1 = createEvent( step, 0 );
        const event2 = createEvent( step + dist, 1 );
        event2.mp.module = "bar";
        
        glideParameterAutomations( song, step, orderIndex, channelIndex, store );

        expect( channel ).toEqual([ 0, 0, event1, 0, event2, 0, 0, 0 ]);

        expect( event1.mp ).toEqual({
            module: "foo",
            value: 0,
            glide: false,
        });
        expect( event2.mp ).toEqual({
            module: "bar",
            value: 1,
            glide: false,
        });
    });

    it( "should be able to insert new events with a gradual increase in parameter value between two events, starting from the first event", () => {
        const step = 2;
        const dist = 3;
        const startValue = 0;
        const targetValue = 1;

        const event1 = createEvent( step, startValue );
        const event2 = createEvent( step + dist, targetValue );

        const increment = ( targetValue - startValue ) / dist;

        glideParameterAutomations( song, step, orderIndex, channelIndex, store );

        expect( channel ).toEqual([
            0, 0, event1, expect.any( Object ), expect.any( Object ), event2, 0, 0,
        ]);

        expect( channel[ step + 1 ].mp ).toEqual({
            module: "foo",
            value: startValue + increment,
            glide: true,
        });
        expect( channel[ step + 2 ].mp ).toEqual({
            module: "foo",
            value: channel[ step + 1 ].mp.value + increment,
            glide: true,
        });
    });

    it( "should keep the original parameter values for the first and second event, but activating glide", () => {
        const step = 2;
        const dist = 3;
        const startValue = 0;
        const targetValue = 1;

        const event1 = createEvent( step, startValue );
        const event2 = createEvent( step + dist, targetValue );

        glideParameterAutomations( song, step, orderIndex, channelIndex, store );

        expect( channel ).toEqual([
            0, 0, event1, expect.any( Object ), expect.any( Object ), event2, 0, 0,
        ]);

        expect( channel[ step ].mp ).toEqual({
            module: "foo",
            value: startValue,
            glide: true,
        });
        expect( channel[ step + dist ].mp ).toEqual({
            module: "foo",
            value: targetValue,
            glide: true,
        });
    });

    it( "should be able to find the first event in a glide range when the glide is requested at an empty slot between two compatible events", () => {
        const step = 2;
        const dist = 3;

        const startValue  = 0;
        const targetValue = 0.66;
    
        const event1 = createEvent( step, startValue );
        const event2 = createEvent( step + dist, targetValue );

        glideParameterAutomations( song, step + 1, orderIndex, channelIndex, store );

        expect( channel ).toEqual([
            0, 0, event1, expect.any( Object ), expect.any( Object ), event2, 0, 0,
        ]);

        expect( channel[ step + 1 ].mp ).toEqual({
            module: "foo",
            value: 0.22,
            glide: true,
        });
        expect( channel[ step + 2 ].mp ).toEqual({
            module: "foo",
            value: 0.44,
            glide: true,
        });
    });

    it( "should be able to insert new events with a gradual decrease in parameter value between two events, starting from the first event", () => {
        const step = 2;
        const dist = 3;
        const startValue  = 0.88;
        const targetValue = 0.22;

        const event1 = createEvent( step, startValue );
        const event2 = createEvent( step + dist, targetValue );

        glideParameterAutomations( song, step, orderIndex, channelIndex, store );

        expect( channel ).toEqual([
            0, 0, event1, expect.any( Object ), expect.any( Object ), event2, 0, 0,
        ]);

        expect( channel[ step + 1 ].mp ).toEqual({
            module: "foo",
            value: 0.66,
            glide: true,
        });
        expect( channel[ step + 2 ].mp ).toEqual({
            module: "foo",
            value: 0.44,
            glide: true,
        });
    });

    it( "should restore the original pattern on undo", () => {
        const step = 2;
        const dist = 3;
        const startValue = 0;
        const targetValue = 1;

        createEvent( step, startValue );
        createEvent( step + dist, targetValue );

        let historyState: IUndoRedoState;
        const commitSpy = vi.spyOn( store, "commit" );
        commitSpy.mockImplementation(( fn, value ) => {
            if ( fn === "saveState" ) {
                historyState = value as IUndoRedoState
            }
        });

        glideParameterAutomations( song, step, orderIndex, channelIndex, store );

        historyState.undo();

        expect( song.patterns[ patternIndex ].channels[ channelIndex ] ).toEqual([ 0, 0, createEvent( step, startValue ), 0, 0, createEvent( step + dist, targetValue ), 0, 0 ]);
        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });

    describe( "when filling the gradual glide between the first and second event", () => {
        it( "should not be able to glide when there are less than 2 events defined", () => {
            const patternIndex = 0;
            const channelIndex = 0;
            const eventIndex = 0;

            const event = createAndInsertEvent( eventIndex, song, patternIndex, channelIndex );
            const createdEvents = glideModuleParams( song, patternIndex, channelIndex, eventIndex );

            expect( createdEvents ).toHaveLength( 0 ); // expected glide to have failed as only one event was available
            expect( event.mp ).toBeUndefined(); // expected no module parameter change to be set
        });

        it( "should not be able to glide when there are no 2 events with module parameter changes defined", () => {
            const patternIndex = 0;
            const channelIndex = 0;
            const eventIndex = 0;

            const event1 = createAndInsertEvent( eventIndex, song, patternIndex, channelIndex );
            const event2 = createAndInsertEvent( eventIndex + 5, song, patternIndex, channelIndex );
            const createdEvents = glideModuleParams( song, patternIndex, channelIndex, eventIndex );

            expect( createdEvents ).toHaveLength( 0 ); // expected glide to have failed as no module parameter changes were available
            expect( event1.mp ).toBeUndefined(); // expected no module parameter change to be set
            expect( event2.mp ).toBeUndefined(); // expected no module parameter change to be set
        });

        it( "should not be able to glide when there are no 2 events with the same module parameter change defined", () => {
            const patternIndex = 0;
            const channelIndex = 0;
            const eventIndex = 0;
            const event2Index = eventIndex + 5;

            const event1 = createAndInsertEvent( eventIndex, song, patternIndex, channelIndex );
            const event2 = createAndInsertEvent( event2Index, song, patternIndex, channelIndex );

            event1.mp = {
                module: "foo",
                value: 0,
                glide: false
            };

            event2.mp = {
                module: "bar",
                value: 1,
                glide: false
            };

            const createdEvents = glideModuleParams( song, patternIndex, channelIndex, eventIndex );

            expect( createdEvents ).toHaveLength( 0 ); // expected glide to have failed as no same module parameter changes were available
        });

        it( "should be able to glide up when there are 2 events with the same module parameter changes defined", () => {
            const patternIndex = 0;
            const channelIndex = 0;
            const eventIndex = 0;
            const event2Index = eventIndex + 4;

            const event1 = createAndInsertEvent( eventIndex, song, patternIndex, channelIndex );
            const event2 = createAndInsertEvent( event2Index, song, patternIndex, channelIndex );

            event1.mp = {
                module: "foo",
                value: 0,
                glide: false
            };

            event2.mp = {
                module: "foo",
                value: 1,
                glide: false
            };

            const createdEvents = glideModuleParams( song, patternIndex, channelIndex, eventIndex );

            expect( createdEvents ).toHaveLength( 3 );

            const events = song.patterns[ patternIndex ].channels[ channelIndex ];
            const expectedValues = [ 0, .25, .5, .75, 1 ];
            for ( let i = eventIndex, e = 0; i < event2Index; ++i, ++e ) {
                const event = events[ i ];
                expect( typeof event ).toBe("object");
                expect( event.mp.glide ).toBe( true ); // expected event module parameter change to be set to glide
                expect( expectedValues[ e ].toFixed (2 )).toEqual( event.mp.value.toFixed( 2 ));
            }
        });

        it( "should be able to glide down when there are 2 events with the same module parameter changes defined", () => {
            const patternIndex = 0;
            const channelIndex = 0;
            const eventIndex = 0;
            const event2Index = eventIndex + 4;

            const event1 = createAndInsertEvent( eventIndex, song, patternIndex, channelIndex );
            const event2 = createAndInsertEvent( event2Index, song, patternIndex, channelIndex );

            event1.mp = {
                module: "foo",
                value: 0.75,
                glide: false
            };

            event2.mp = {
                module: "foo",
                value: 0.25,
                glide: false
            };

            const createdEvents = glideModuleParams( song, patternIndex, channelIndex, eventIndex );

            expect( createdEvents ).toHaveLength( 3 );
            
            const events = song.patterns[ patternIndex ].channels[ channelIndex ];
            const expectedValues = [ 0.75, 0.625, 0.5, 0.375, 0.25 ];
            for ( let i = eventIndex, e = 0; i < event2Index; ++i, ++e ) {
                const event = events[ i ];
                expect( typeof event ).toBe( "object" );
                expect( event.mp.glide ).toBe( true ); // expected event module parameter change to be set to glide
                expect( event.mp.value.toFixed( 2 )).toEqual( expectedValues[ e ].toFixed( 2 ));
            }
        });
    });
});