import { describe, it, expect, beforeEach } from "vitest";
import { PITCH_UP } from "@/definitions/automatable-parameters";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { ACTION_AUTO_ONLY, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxChannel } from "@/model/types/channel";
import type { EffluxSong } from "@/model/types/song";
import EventUtil, {
    areEventsEqual,
    getEventLength,
    getPrevEvent,
    getNextEvent,
    calculateMeasureLength,
    calculateJamChannelEventLengths
} from "@/utils/event-util";
import { createAndInsertEvent } from "../helpers";

describe( "EventUtil", () => {
    let song: EffluxSong;

    beforeEach(() => {
        song = SongFactory.create( 8 );
    });

    /* actual unit tests */

    it( "should be able to update the position of a AudioEvent", () => {
        const pattern = song.patterns[ 0 ];
        song.meta.tempo = 120;

        const expectedStartMeasureOffset = 1; // half in measure (measure lasts 2s at 120 BPM)
      
        const audioEvent = EventFactory.create();

        EventUtil.setPosition( audioEvent, pattern, pattern.steps / 2, song.meta.tempo );

        expect( audioEvent.seq.startMeasureOffset ).toEqual( expectedStartMeasureOffset );
    });

    describe( "when requesting to clear and AudioEvent", () => {
        it( "should be able to clear the AudioEvent for any requested step position", () => {
            const patternIndex = 0;
            const pattern = song.patterns[ patternIndex ];

            // generate some note content

            const pchannel1 = pattern.channels[ 0 ];
            const pchannel2 = pattern.channels[ 1 ];

            // create some AudioEvents

            const expected1 = pchannel1[ 0 ] = EventFactory.create( 1, "E", 2, ACTION_NOTE_ON );
            const expected2 = pchannel1[ 1 ] = EventFactory.create( 1, "F", 3, ACTION_NOTE_ON );
            const expected3 = pchannel2[ 0 ] = EventFactory.create( 1, "F#",4, ACTION_NOTE_ON );
            const expected4 = pchannel2[ 1 ] = EventFactory.create( 1, "G", 5, ACTION_NOTE_ON );

            // start clearing individual events and asserting the results

            EventUtil.clearEvent( song, patternIndex, 0, 0 );

            expect( expected1 ).not.toEqual( pchannel1[ 0 ]);
            expect( 0 ).toEqual( pchannel1[ 0 ]); // event should now be 0

            EventUtil.clearEvent( song, patternIndex, 1, 0 );

            expect( expected3 ).not.toEqual( pchannel2[ 0 ]);
            expect( 0 ).toEqual( pchannel2[ 0 ]); // event should now be 0

            // assert remaining events are still existent

            expect( expected2 ).toEqual( pchannel1[ 1 ]);
            expect( expected4 ).toEqual( pchannel2[ 1 ]);
        });

        describe( "and requesting to keep the event if it has a parameter automation", () => {
            const patternIndex = 0;
            const channelIndex = 0;
            const step = 2;

            it( "should clear the audio event when it has no parameter automation", () => {
                const channel = song.patterns[ patternIndex ].channels[ channelIndex ];
                channel[ step ] = EventFactory.create( 1, "E", 2, ACTION_NOTE_ON );

                EventUtil.clearEvent( song, patternIndex, channelIndex, step, true );

                expect( channel[ step ]).toEqual( 0 );
            });

            it( "should change the events action and keep the parameter automation when automation existed", () => {
                const channel = song.patterns[ patternIndex ].channels[ channelIndex ];
                const event = EventFactory.create( 1, "E", 2, ACTION_NOTE_ON, {
                    module: PITCH_UP,
                    value: 77,
                    glide: false,
                });
                channel[ step ] = event;

                EventUtil.clearEvent( song, patternIndex, channelIndex, step, true );

                expect( channel[ step ]).toEqual({
                    ...event,
                    action: ACTION_AUTO_ONLY,
                    note: "",
                    octave: 0,
                });
            });
        });
    });

    describe("calculating previous and next events for any given event", () => {
        it( "should be able to retrieve the first event before the given step", () => {
            const channelEvents: EffluxChannel = [];

            const event1 = EventFactory.create();
            const event2 = EventFactory.create();
            const event3 = EventFactory.create();

            channelEvents.push( event1 ); // step 0
            channelEvents.push( null );   // step 1
            channelEvents.push( event2 ); // step 2
            channelEvents.push( event3 ); // step 3

            expect(event2).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 3 ));
            expect(event1).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 2 ));
            expect(event1).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 1 ));
            expect(null).toEqual(EventUtil.getFirstEventBeforeStep( channelEvents, 0 ));
        });

        it( "should be able to retrieve the first event before the given step that matches given compare function", () => {
            const channelEvents: EffluxChannel = [];

            const event1 = EventFactory.create();
            const event2 = EventFactory.create();
            const event3 = EventFactory.create();

            event1.mp = { value: 0.5, glide: false, module: PITCH_UP };

            channelEvents.push( event1 ); // step 0
            channelEvents.push( event2 ); // step 1
            channelEvents.push( event3 ); // step 2

            expect(event1).toEqual( EventUtil.getFirstEventBeforeStep( channelEvents, 2, ( compareEvent ) => {
                return compareEvent.mp && compareEvent.mp.module === PITCH_UP;
            }));
        });
    });

    describe( "when determining whether two given events are equal in content", () => {
        const event1 = EventFactory.create();

        //instrument: number = 0, note: string = "", octave: number = 0, action: number = 0
        it( "should consider events for different instruments unequal", () => {
            const event1 = EventFactory.create( 0, "C", 3, ACTION_NOTE_ON );
            const event2 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );

            expect( areEventsEqual( event1, event2 )).toBe( false );
        });

        it( "should consider noteOn-events for different notes unequal", () => {
            const event1 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );
            const event2 = EventFactory.create( 1, "D", 3, ACTION_NOTE_ON );

            expect( areEventsEqual( event1, event2 )).toBe( false );
        });

        it( "should consider noteOn-events for different octaves unequal", () => {
            const event1 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );
            const event2 = EventFactory.create( 1, "C", 4, ACTION_NOTE_ON );

            expect( areEventsEqual( event1, event2 )).toBe( false );
        });

        it( "should consider events for different actions unequal", () => {
            const event1 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );
            const event2 = EventFactory.create( 1, "C", 3, ACTION_NOTE_OFF );

            expect( areEventsEqual( event1, event2 )).toBe( false );
        });

        it( "should consider events with the same properties (where neither have automation parameters) as equal", () => {
            const event1 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );
            const event2 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );

            expect( areEventsEqual( event1, event2 )).toBe( true );
        });

        it( "should consider events where only one of both has automation parameters unequal", () => {
            const event1 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );
            const event2 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );

            event1.mp = { module: "delayEnabled", value: 1, glide: true };

            expect( areEventsEqual( event1, event2 )).toBe( false );
        });

        it( "should consider events where only both have different automation parameters unequal", () => {
            const event1 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );
            const event2 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );

            event1.mp = { module: "delayEnabled", value: 1, glide: true };

            event2.mp = { module: "delayCutoff", value: 1, glide: true };
            expect( areEventsEqual( event1, event2 )).toBe( false );

            event2.mp = { module: "delayEnabled", value: 2, glide: true };
            expect( areEventsEqual( event1, event2 )).toBe( false );

            event2.mp = { module: "delayEnabled", value: 2, glide: false };
            expect( areEventsEqual( event1, event2 )).toBe( false );
        });

        it( "should consider events where both have the same automation parameters as equal", () => {
            const event1 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );
            const event2 = EventFactory.create( 1, "C", 3, ACTION_NOTE_ON );

            event1.mp = { module: "delayEnabled", value: 1, glide: true };
            event2.mp = { module: "delayEnabled", value: 1, glide: true };

            expect( areEventsEqual( event1, event2 )).toBe( true );
        });
    });

    describe( "when managing the relative position of an event inside a Song", () => {
        const song = SongFactory.create( 2 );
        const pattern1channels: EffluxChannel[] = [
            [], [],
        ];
        const pattern2channels: EffluxChannel[] = [
            [], [],
        ];
        const pattern3channels: EffluxChannel[] = [
            [], [],
        ];
        song.patterns = [
            PatternFactory.create( 4, pattern1channels ),
            PatternFactory.create( 4, pattern2channels ),
            PatternFactory.create( 4, pattern3channels ),
        ];
        let orderIndex: number;
        let patternIndex: number;
        let channelIndex: number;

        beforeEach(() => {
            [ pattern1channels, pattern2channels, pattern3channels ].forEach( channelList => {
                for ( const channel of channelList ) {
                    channel.length = 0;
                }
            })
        });

        describe( "and retrieving the next event following the given one", () => {
            beforeEach(() => {
                song.order = [ 0, 1, 1, 2, 1 ];
                orderIndex   = 3;
                patternIndex = song.order[ orderIndex ];
                channelIndex = 0;
            });

            it( "should return undefined when no event could be found", () => {
                const event  = createAndInsertEvent( 0, song, patternIndex, channelIndex );

                const result = getNextEvent( song, event, channelIndex, orderIndex );

                expect( result ).toBeUndefined();
            });

            it( "should return a reference to the next event and its order index, when found", () => {
                const event  = createAndInsertEvent( 0, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 2, song, patternIndex, channelIndex );

                const result = getNextEvent( song, event, channelIndex, orderIndex );

                expect( result.event ).toEqual( event2 );
                expect( result.orderIndex ).toEqual( orderIndex );
            });

            it( "should be able to find the next event within the same channel", () => {
                const event  = createAndInsertEvent( 0, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 2, song, patternIndex, channelIndex ); // expected match
                const event3 = createAndInsertEvent( 3, song, patternIndex, channelIndex );
                const event4 = createAndInsertEvent( 1, song, patternIndex, channelIndex + 1 ); // closer, but different channel

                expect( getNextEvent( song, event, channelIndex, orderIndex ).event ).toEqual( event2 );
            });

            it( "should be able to find the next event in the following pattern (as determined by the song order)", () => {
                const nextPatternIndex = song.order[ orderIndex + 1 ];

                const event  = createAndInsertEvent( 2, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 1, song, patternIndex, channelIndex );
                const event3 = createAndInsertEvent( 1, song, nextPatternIndex, channelIndex ); // expected match
                const event4 = createAndInsertEvent( 3, song, nextPatternIndex, channelIndex );

                const result = getNextEvent( song, event, channelIndex, orderIndex );

                expect( result.event ).toEqual( event3 );
                expect( result.orderIndex ).toEqual( orderIndex + 1 );
            });

            it( "should be able to ignore an event when its matched the predicate of the optionally provided ignore function", () => {
                const ignoreFn = ( _event: EffluxAudioEvent, compareEvent: EffluxAudioEvent ) => {
                    return compareEvent.action === ACTION_AUTO_ONLY;
                };

                const event  = createAndInsertEvent( 0, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 1, song, patternIndex, channelIndex, ACTION_AUTO_ONLY ); // should be ignored
                const event3 = createAndInsertEvent( 2, song, patternIndex, channelIndex ); // expected match

                expect( getNextEvent( song, event, channelIndex, orderIndex, ignoreFn ).event ).toEqual( event3 );
            });

            it( "should be able to find itself when the event's pattern is reused in a subsequent position inside the order index", () => {
                song.order = [ 0, 1, 1, 2, 1 ];
                orderIndex   = 2;
                patternIndex = song.order[ orderIndex ];

                const event  = createAndInsertEvent( 3, song, patternIndex, channelIndex );
                const result = getNextEvent( song, event, channelIndex, orderIndex );

                // event also appears in order index #4
                expect( result.event ).toEqual( event );
                expect( result.orderIndex ).toEqual( 4 );
            });

            it( "should be able to find the last event in the last pattern as defined by the order index", () => {
                const orderIndex = 0;
                const patternIndex = song.order[ orderIndex ];
                const lastPatternIndex = song.order[ song.order.length - 1 ];

                const event  = createAndInsertEvent( 0, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 3, song, lastPatternIndex, channelIndex );

                const result = getNextEvent( song, event, channelIndex, orderIndex );

                expect( result.event ).toEqual( event2 );
                expect( result.orderIndex ).toEqual( lastPatternIndex );
            });
        });

        describe( "and retrieving the previous event preceding the given one", () => {
            beforeEach(() => {
                song.order = [ 0, 1, 1, 2, 1 ];
                orderIndex   = 4;
                patternIndex = song.order[ orderIndex ];
                channelIndex = 0;
            });

            it( "should return undefined when no event could be found", () => {
                orderIndex   = 3;
                patternIndex = song.order[ orderIndex ];

                const event = createAndInsertEvent( 2, song, patternIndex, channelIndex );

                const result = getPrevEvent( song, event, channelIndex, orderIndex );

                expect( result ).toBeUndefined();
            });

            it( "should return a reference to the previous event and its order index, when found", () => {
                const event  = createAndInsertEvent( 2, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 0, song, patternIndex, channelIndex );

                const result = getPrevEvent( song, event, channelIndex, orderIndex );

                expect( result.event ).toEqual( event2 );
                expect( result.orderIndex ).toEqual( orderIndex );
            });

            it( "should be able to find the previous event within the same channel", () => {
                const event  = createAndInsertEvent( 3, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 1, song, patternIndex, channelIndex ); // expected match
                const event3 = createAndInsertEvent( 0, song, patternIndex, channelIndex );
                const event4 = createAndInsertEvent( 2, song, patternIndex, channelIndex + 1 ); // closer, but different channel

                expect( getPrevEvent( song, event, channelIndex, orderIndex ).event ).toEqual( event2 );
            });

            it( "should be able to find the previous event in the preceding pattern (as determined by the song order)", () => {
                const prevPatternIndex = song.order[ orderIndex - 1 ];

                const event  = createAndInsertEvent( 2, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 3, song, patternIndex, channelIndex );
                const event3 = createAndInsertEvent( 1, song, prevPatternIndex, channelIndex );
                const event4 = createAndInsertEvent( 2, song, prevPatternIndex, channelIndex ); // expected match

                const result = getPrevEvent( song, event, channelIndex, orderIndex );

                expect( result.event ).toEqual( event4 );
                expect( result.orderIndex ).toEqual( orderIndex - 1 );
            });

            it( "should be able to ignore an event when its matched the predicate of the optionally provided ignore function", () => {
                const ignoreFn = ( _event: EffluxAudioEvent, compareEvent: EffluxAudioEvent ) => {
                    return compareEvent.action === ACTION_AUTO_ONLY;
                };

                const event  = createAndInsertEvent( 2, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 1, song, patternIndex, channelIndex, ACTION_AUTO_ONLY ); // should be ignored
                const event3 = createAndInsertEvent( 0, song, patternIndex, channelIndex ); // expected match

                expect( getPrevEvent( song, event, channelIndex, orderIndex, ignoreFn ).event ).toEqual( event3 );
            });

            it( "should be able to find itself when the event's pattern is reused in a previous position inside the order index", () => {
                const firstPatternIndex = song.order[ 0 ];

                const event  = createAndInsertEvent( 3, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 0, song, firstPatternIndex, channelIndex );

                const result = getPrevEvent( song, event, channelIndex, orderIndex );

                // event appears previously in order index #2
                expect( result.event ).toEqual( event );
                expect( result.orderIndex ).toEqual( 2 );
            });

            it( "should be able to find the first event in the first pattern as defined by the order index", () => {
                song.order = [ 0, 2, 2, 2, 1 ];

                const firstPatternIndex = song.order[ 0 ];

                const event  = createAndInsertEvent( 3, song, patternIndex, channelIndex );
                const event2 = createAndInsertEvent( 0, song, firstPatternIndex, channelIndex );

                const result = getPrevEvent( song, event, channelIndex, orderIndex );

                expect( result.event ).toEqual( event2 );
                expect( result.orderIndex ).toEqual( 0 );
            });
        });
    });

    describe( "when calculating the total event duration", () => {
        const song = SongFactory.create( 2 );
        const measureLength = calculateMeasureLength( song.meta.tempo );
        const pattern1channels: EffluxChannel[] = [
            [], [],
        ];
        const pattern2channels: EffluxChannel[] = [
            [], [],
        ];
        const pattern3channels: EffluxChannel[] = [
            [], [],
        ];
        song.patterns = [
            PatternFactory.create( 4, pattern1channels ),
            PatternFactory.create( 4, pattern2channels ),
            PatternFactory.create( 4, pattern3channels ),
        ];
        song.order = [ 0, 1, 1, 2, 1 ];

        const orderIndex   = 3;
        const patternIndex = song.order[ orderIndex ];
        const channelIndex = 0;

        beforeEach(() => {
            [ pattern1channels, pattern2channels, pattern3channels ].forEach( channelList => {
                for ( const channel of channelList ) {
                    channel.length = 0;
                }
            })
        });

        it( "should always return a single-step duration for an effect parameter modulation-only event", () => {
            const event = createAndInsertEvent( 0, song, patternIndex, channelIndex, ACTION_AUTO_ONLY );
            event.mp = {
                module: "filterQ",
                value: 1,
                glide: true,
            };
            const event2 = createAndInsertEvent( 3, song, patternIndex, channelIndex );

            const expected = ( 1 / song.patterns[ patternIndex ].steps ) * measureLength;

            expect( getEventLength( event, channelIndex, orderIndex, song )).toEqual( expected );
        });

        it( "should extend its duration until the next available event inside the same pattern", () => {
            const event  = createAndInsertEvent( 0, song, patternIndex, channelIndex );
            const event2 = createAndInsertEvent( 3, song, patternIndex, channelIndex );
            
            expect( getEventLength( event, channelIndex, orderIndex, song )).toEqual( 1.5 );
        });

        it( "should extend its duration until the next available event inside the following pattern, as defined by the order index", () => {
            const lastPatternIndex = song.order[ song.order.length - 1 ];
            
            const event  = createAndInsertEvent( 0, song, patternIndex, channelIndex );
            const event2 = createAndInsertEvent( 3, song, lastPatternIndex, channelIndex );
            
            expect( getEventLength( event, channelIndex, orderIndex, song )).toEqual( 3.5 );
        });

        it( "should extend its duration until it encounters itself as the next available event if the songs order index reuses the same parent pattern", () => {
            const orderIndex   = 2; // expected parent pattern to reappear at index 4
            const patternIndex = song.order[ orderIndex ];
            
            const event = createAndInsertEvent( 1, song, patternIndex, channelIndex );
            expect( getEventLength( event, channelIndex, orderIndex, song )).toEqual( 4 );
        });

        it( "should only consider events inside the same channel", () => {
            const event  = createAndInsertEvent( 0, song, patternIndex, channelIndex );
            const event2 = createAndInsertEvent( 2, song, patternIndex, channelIndex + 1 ); // closest, but different channel
            const event3 = createAndInsertEvent( 3, song, patternIndex, channelIndex ); // expected match
            
            expect( getEventLength( event, channelIndex, orderIndex, song )).toEqual( 1.5 );
        });

        it( "should ignore non-noteOn/noteOff events", () => {
            const event  = createAndInsertEvent( 0, song, patternIndex, channelIndex );
            const event2 = createAndInsertEvent( 1, song, patternIndex, channelIndex , ACTION_AUTO_ONLY ); // closest, but ignored
            const event3 = createAndInsertEvent( 2, song, patternIndex, channelIndex, ACTION_NOTE_OFF ); // expected match
            
            expect( getEventLength( event, channelIndex, orderIndex, song )).toEqual( 1 );
        });

        it( "should extend its duration until the end of the pattern order if no subsequent event is found", () => {
            const event = createAndInsertEvent( 0, song, patternIndex, channelIndex );
            
            expect( getEventLength( event, channelIndex, orderIndex, song )).toEqual( 4 );
        });
    });

    it( "should be able to calculate the lengths of all events within a single jam channel pattern", () => {
        const pattern = song.patterns[ 0 ];

        const event1 = createAndInsertEvent( 0, song, 0, 0 );
        const event2 = createAndInsertEvent( 1, song, 0 ,0, ACTION_NOTE_OFF );
        const event3 = createAndInsertEvent( 2, song, 0, 0 );
        const event4 = createAndInsertEvent( 3, song, 0, 0, ACTION_AUTO_ONLY );
        const event5 = createAndInsertEvent( 5, song, 0, 0, ACTION_NOTE_OFF );
        const event6 = createAndInsertEvent( 7, song, 0, 0 );
        const event7 = createAndInsertEvent( 15, song, 0, 0 );

        calculateJamChannelEventLengths( pattern.channels[ 0 ], song.meta.tempo );

        // duration in seconds for single pattern step
        const STEP_IN_SEC = calculateMeasureLength( song.meta.tempo ) / pattern.steps;
        
        expect( event1.seq.length ).toEqual( STEP_IN_SEC ); // single step because killed in step 2 by noteOff
        expect( event2.seq.length ).toEqual( STEP_IN_SEC ); // single step because noteOff
        expect( event3.seq.length ).toEqual( 3 * STEP_IN_SEC ); // lasts from step 2 to 5
        expect( event4.seq.length ).toEqual( STEP_IN_SEC ); // single step because automation only
        expect( event5.seq.length ).toEqual( STEP_IN_SEC ); // single step because note off
        expect( event6.seq.length ).toEqual( 8 * STEP_IN_SEC ); // lasts from step 7 to 15
        expect( event7.seq.length ).toEqual( STEP_IN_SEC ); // single step because last in pattern
    });
});
