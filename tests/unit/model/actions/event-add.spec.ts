import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import { PITCH_UP } from "@/definitions/automatable-parameters";
import AddEvent from "@/model/actions/event-add";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxAudioEvent, ACTION_IDLE, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { type EffluxSong, EffluxSongType } from "@/model/types/song";
import { createMockStore } from "../../mocks";

vi.mock( "@/utils/event-util", async () => {
    const actual = await vi.importActual( "@/utils/event-util" ) as object;
    return {
        ...actual,
        default: {
            ...actual.default,
            setPosition: vi.fn(), // by stubbing this we can compare event more easily
        }
    }
});

describe( "Event add action", () => {
    const store = createMockStore();
    
    const patternIndex = 1;
    const channelIndex = 1;
    const step = 5;

    let song: EffluxSong;

    let event1: EffluxAudioEvent;
    let event2: EffluxAudioEvent;
    let event3: EffluxAudioEvent;
    let event4: EffluxAudioEvent;

    beforeEach(() => {
        song = SongFactory.create( 1, EffluxSongType.TRACKER );
        song.patterns = [ PatternFactory.create( 8 ), PatternFactory.create( 8 ) ];
        song.order = [ 0, 1 ];

        store.state.song.activeSong = song;

        store.getters.activePatternIndex = patternIndex;
        store.state.editor.selectedInstrument = channelIndex;
        store.state.editor.selectedStep = step;
        
        event1 = EventFactory.create( channelIndex, "C", 3, ACTION_NOTE_ON ); // from 0 - 2
        event2 = EventFactory.create( channelIndex, "D", 3, ACTION_NOTE_ON ); // from 2 - 4
        event3 = EventFactory.create( channelIndex, "F", 3, ACTION_NOTE_ON ); // from 4 - 7
        event4 = EventFactory.create( channelIndex, "G", 3, ACTION_NOTE_ON ); // from 7

        song.patterns[ patternIndex ].channels[ channelIndex ] = [
            event1, 0, event2, 0, event3, 0, 0, event4
        ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should by default add a new event at the current pattern and channel indices, at the current step", () => {
        const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );

        AddEvent( store, event, {}, vi.fn() );

        expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual([
            event1, 0, event2, 0, event3, event, 0, event4
        ]);
    });

    it( "should be able to add the event at the optionally provided pattern and channel indices, and step value", () => {
        const event = EventFactory.create( 0, "E", 4, ACTION_NOTE_ON );

        AddEvent( store, event, { patternIndex: 0, channelIndex: 0, step: 2 }, vi.fn() );

        expect( song.patterns[ 0 ].channels[ 0 ]).toEqual([ 0, 0, event, 0, 0, 0, 0, 0 ]);
    });

    it( "should invalidate the channel cache", () => {
        const commitSpy = vi.spyOn( store, "commit" );
        const event = EventFactory.create( 0, "E", 4, ACTION_NOTE_ON );

        AddEvent( store, event, { patternIndex: 0, channelIndex: 0, step: 2 }, vi.fn() );

        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });

    it( "should call the update handler with the advanceOnAddition defaulting to true", () => {
        const updateHandler = vi.fn();
        const event = EventFactory.create( 0, "E", 4, ACTION_NOTE_ON );

        AddEvent( store, event, { patternIndex: 0, channelIndex: 0, step: 2 }, updateHandler );

        expect( updateHandler ).toHaveBeenCalledWith( true );
    });

    it( "should call the update handler passing the optionally provided advanceOnAddition value", () => {
        const updateHandler = vi.fn();
        const event = EventFactory.create( 0, "E", 4, ACTION_NOTE_ON );

        AddEvent( store, event, { patternIndex: 0, channelIndex: 0, step: 2, advanceOnAddition: false }, updateHandler );

        expect( updateHandler ).toHaveBeenCalledWith( false );
    });

    it( "should keep the assigned instrument unchanged", () => {
        event3.instrument = 3;

        const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );
        expect( event.instrument ).toEqual( channelIndex );

        AddEvent( store, event, {}, vi.fn() );

        expect( event.instrument ).toEqual( channelIndex );
    });

    it( "should take the instrument of the previous note in the same channel if the provided event is flagged as new", () => {
        event3.instrument = 3;

        const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );
        expect( event.instrument ).toEqual( channelIndex );

        AddEvent( store, event, { newEvent: true }, vi.fn() );

        expect( event.instrument ).toEqual( 3 );
    });

    it( "should be able to revert the changes, always calling the update handler", () => {
        const updateHandler = vi.fn();
        const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );

        const { undo } = AddEvent( store, event, { patternIndex, channelIndex, step: 1 }, updateHandler );
        vi.restoreAllMocks();

        undo();

        expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual([
            event1, 0, event2, 0, event3, 0, 0, event4
        ]);
        expect( updateHandler ).toHaveBeenCalled();
    });

    it( "should invalidate the channel cache on undo", () => {
        const commitSpy = vi.spyOn( store, "commit" );
        const event = EventFactory.create( 0, "E", 4, ACTION_NOTE_ON );

        const { undo } = AddEvent( store, event, { patternIndex: 0, channelIndex: 0, step: 2 }, vi.fn() );
        vi.restoreAllMocks();

        undo();

        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });

    describe( "when the current song is of the JAM type", () => {
        const NOTE_OFF_EVENT = EventFactory.create( channelIndex, "", 0, ACTION_NOTE_OFF );

        beforeEach(() => {
            song.type = EffluxSongType.JAM;    
        });

        it( "should by default add a noteOff event after the added event", () => {
            const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );
    
            AddEvent( store, event, { patternIndex, channelIndex, step: 5 }, vi.fn() );
    
            // original content was [ event1, 0, event2, 0, event3, 0, 0, event4 ]
            expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual([
                event1, 0, event2, 0, event3, event, NOTE_OFF_EVENT, event4
            ]);
        });

        it( "should maintain the existing module automation that optionally existed at the noteOff step", () => {
            const channel = song.patterns[ patternIndex ].channels[ channelIndex ];

            const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );
            const mpEvent = EventFactory.create( channelIndex, "", 0, ACTION_IDLE );
            mpEvent.mp = {
                module: PITCH_UP,
                value: 50,
                glide: true,
            };
            channel[ 6 ] = mpEvent;
    
            AddEvent( store, event, { patternIndex, channelIndex, step: 5 }, vi.fn() );
    
            // original content was [ event1, 0, event2, 0, event3, 0, mpEvent, event4 ]
            expect( channel ).toEqual([
                event1, 0, event2, 0, event3, event, expect.any( Object ), event4
            ]);

            expect( channel[ 6 ]).toEqual({
                ...NOTE_OFF_EVENT,
                mp: mpEvent.mp,
            });
        });

        it( "should be able to revert the changes, also removing the created noteOff event", () => {
            const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );
            const mpEvent = EventFactory.create( channelIndex, "", 0, ACTION_IDLE );
            mpEvent.mp = {
                module: PITCH_UP,
                value: 50,
                glide: true,
            };
            song.patterns[ patternIndex ].channels[ channelIndex ][ 6 ] = mpEvent;
    
            const { undo } = AddEvent( store, event, { patternIndex, channelIndex, step: 5 }, vi.fn() );
            undo();
    
            expect( song.patterns[ patternIndex ].channels[ channelIndex ] ).toEqual([
                event1, 0, event2, 0, event3, 0, mpEvent, event4
            ]);
        });

        it( "should not add a noteOff event when an existing event follows the added event", () => {
            const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );
    
            AddEvent( store, event, { patternIndex, channelIndex, step: 3 }, vi.fn() );
    
            // original content was [ event1, 0, event2, 0, event3, 0, 0, event4 ]
            expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual([
                event1, 0, event2, event, event3, 0, 0, event4
            ]);
        });

        it( "should not add a noteOff event when the added event contains no instruction other than a parameter automation", () => {
            const event = EventFactory.create( channelIndex, "", 1, ACTION_IDLE );
            event.mp = {
                module: PITCH_UP,
                value: 77,
                glide: false,
            };
            AddEvent( store, event, { patternIndex, channelIndex, step: 5 }, vi.fn() );
    
            // original content was [ event1, 0, event2, 0, event3, 0, 0, event4 ]
            expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual([
                event1, 0, event2, 0, event3, event, 0, event4
            ]);
        });

        describe( "and the requested length is larger than 1 step", () => {
            it( "should cut the length of any existing (long duration) notes the new event would overlap", () => {
                const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );

                AddEvent( store, event, { patternIndex, channelIndex, step: 3, length: 2 }, vi.fn() );
        
                // original content was [ event1, 0, event2, 0, event3, 0, 0, event4 ]
                expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual([
                    event1, 0, event2, event, 0, event3, 0, event4
                ]);
            });

            it( "should be able to revert the changes, restoring all original contents", () => {
                const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );
        
                const { undo } = AddEvent( store, event, { patternIndex, channelIndex, step: 3, length: 2 }, vi.fn() );
                undo();
        
                expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual([
                    event1, 0, event2, 0, event3, 0, 0, event4
                ]);
            });

            describe( "and the overlapping range has existing events with parameter automations", () => {
                beforeEach(() => {
                    event3.mp = {
                        module: PITCH_UP,
                        value: 77,
                        glide: false,
                    };
                });
                
                it( "should keep the existing parameter automation events but remove their note on/off actions", () => {
                    const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );

                    AddEvent( store, event, { patternIndex, channelIndex, step: 3, length: 2 }, vi.fn() );
                    
                    const channel = song.patterns[ patternIndex ].channels[ channelIndex ];
                 
                    // original content was [ event1, 0, event2, 0, event3, 0, 0, event4 ]
                    expect( channel).toEqual([
                        event1, 0, event2, event, expect.any( Object ), expect.any( Object ) /* event3 */, 0, event4
                    ]);

                    const mpEvent = channel[ 4 ]; // the remaining mp that was defined in the original event3
                    const shortenedEvent = channel[ 5 ]; // is event3 pushed forwards, but stripped of mp

                    expect( mpEvent ).toEqual({
                        ...event3,
                        action: ACTION_IDLE,
                        note: "",
                        octave: 0,
                    });

                    expect( shortenedEvent ).toEqual({
                        ...event3,
                        mp: undefined,
                    });
                });

                it( "should be able to revert the changes, restoring all automations to their original owners", () => {
                    const event = EventFactory.create( channelIndex, "E", 4, ACTION_NOTE_ON );

                    const { undo } = AddEvent( store, event, { patternIndex, channelIndex, step: 3, length: 2 }, vi.fn() );
                    undo();
            
                    expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual([
                        event1, 0, event2, 0, event3, 0, 0, event4
                    ]);
                });
            });
        });
    });
});
