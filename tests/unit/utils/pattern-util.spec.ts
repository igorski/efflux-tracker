import { describe, it, expect, beforeAll } from "vitest";
import PatternUtil, { serializePatternFile, deserializePatternFile, arePatternsEqual } from "@/utils/pattern-util";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import type { EffluxPattern } from "@/model/types/pattern";

describe( "PatternUtil", () => {
    it( "should be able to add a new pattern at the given insertion index", () => {
        const amount = 10, steps = 16, temp = new Array(amount);
        let patterns: EffluxPattern[] = new Array(amount);

        for ( let i = 0; i < amount; ++i ) {
            patterns[i] = temp[i] = PatternFactory.create(steps);
        }
        const insertion = 5;
        patterns = PatternUtil.addPatternAtIndex(patterns, insertion, steps);

        expect(amount + 1).toEqual(patterns.length); // expected pattern list to have expanded in size
        expect(temp[insertion - 1]).toEqual(patterns[insertion - 1]); // expected the last pattern prior to the insertion to equal the original one
        expect(temp[insertion]).toEqual(patterns[insertion + 1]); // expected the first pattern after the insertion to equal the original one at the insertion offset

        expect(temp.indexOf(patterns[insertion])).toEqual(-1); // expected the content inserted at the insertion point not to be present in the original list
    });

    it( "should be able to add the given pattern at the given insertion index", () => {
        const amount = 10, steps = 16, temp = new Array(amount);
        let patterns: EffluxPattern[] = new Array(amount);

        for (let i = 0; i < amount; ++i)
            patterns[i] = temp[i] = PatternFactory.create(steps);

        const patternToInsert = PatternFactory.create(steps);
        const insertion = 5;

        PatternUtil.addPatternAtIndex(patterns, insertion, steps, patternToInsert);
        expect(temp[insertion]).toEqual(patternToInsert); // expected the content inserted at the insertion point to be the given pattern
    });

    it( "should be able to add a new pattern with a unique amount of steps different to the existing pattern step amounts", () => {
        const amount = 10, steps = 16, newSteps = 32, insertion = 5;
        let patterns: EffluxPattern[] = new Array( amount );

        for ( let i = 0; i < amount; ++i ) {
            patterns[i] = PatternFactory.create(steps);
        }
        patterns = PatternUtil.addPatternAtIndex(patterns, insertion, newSteps);

        for ( let i = 0; i < ( amount + 1 ); ++i ) {
            if (i !== insertion) {
                expect(steps).toEqual(patterns[i].steps); // expected original pattern step amount not to have changed after insertion
            }
            else {
                expect(newSteps).toEqual(patterns[i].steps); // expected newly created pattern to have the requested amount of steps
            }
        }
    });

    it( "should be able to remove a pattern from the given deletion index", () => {
        const amount = 10, temp = new Array(amount);
        let patterns: EffluxPattern[] = new Array(amount);

        for ( let i = 0; i < amount; ++i ) {
            patterns[i] = temp[i] = PatternFactory.create(16);
        }
        const deletion = 5;
        patterns = PatternUtil.removePatternAtIndex(patterns, deletion);

        expect(amount - 1).toEqual(patterns.length); // expected pattern list to have contracted in size
        expect(temp[deletion - 1]).toEqual(patterns[deletion - 1]); // expected the last pattern prior to the removal to equal the original one
        expect(temp[deletion + 1]).toEqual(patterns[deletion]); // expected the first pattern after the removal to equal the original one at the deletion index
    });

    describe( "when serializing and deserializing a pattern into a encoded file", () => {
        const patternSteps = 4;
        const patterns: EffluxPattern[] = [];

        beforeAll(() => {
            const pattern = PatternFactory.create( patternSteps );
            pattern.channels.forEach(( channel, channelIndex ) => {
                for ( let i = 0; i < 4; i += 2 ) {
                    channel[ i ] = EventFactory.create( channelIndex );
                }
            });
            patterns.push( pattern );
        });

        it( "should be able to serialize a pattern list into a base64 encoded String", () => {
            expect( serializePatternFile( patterns )).toEqual( expect.any( String ));
        });

        it( "should be able to deserialize an encoded pattern list back into a pattern list", () => {
            expect( deserializePatternFile( serializePatternFile( patterns ))).toEqual( patterns );
        });

        it( "should return null when an deserialized pattern list failed to validate as a valid pattern list", () => {
            const invalid = window.btoa( JSON.stringify({ patterns: [{ id: "not a pattern" }] }));
            expect( deserializePatternFile( invalid )).toBeNull();
        });

        it( "should by default copy the full channel range", () => {
            const copied = deserializePatternFile( serializePatternFile( patterns ));
            expect( copied ).toEqual( patterns );
        });

        it( "should allow copying from arbitrary channel ranges", () => {
            const copied = deserializePatternFile( serializePatternFile( patterns, 3, 6 ));
            const emptyChannel = new Array( patternSteps ).fill( 0 );
            const sourceChannels = patterns[ 0 ].channels;
            expect( copied[ 0 ].channels ).toEqual([
                emptyChannel, emptyChannel, emptyChannel, // 0, 1, 2
                sourceChannels[ 3 ],  sourceChannels[ 4 ],  sourceChannels[ 5 ],  sourceChannels[ 6 ], // 3, 4, 5, 6
                emptyChannel, // 7
            ]);
        });
    });

    describe( "when determining whether two given patterns are equal in content", () => {
        const event1 = EventFactory.create( 1, "C", 3 );
        const event2 = EventFactory.create( 1, "D", 3 );
        const event3 = EventFactory.create( 2, "C", 3 );

        it( "should consider patterns of different step sizes unequal", () => {
            const pattern1 = PatternFactory.create( 16 );
            const pattern2 = PatternFactory.create( 8 );

            expect( arePatternsEqual( pattern1, pattern2 )).toBe( false );
        });

        it( "should consider patterns of different channel amounts unequal", () => {
            const pattern1 = PatternFactory.create( 16, [[], []] );
            const pattern2 = PatternFactory.create( 16, [[]] );

            expect( arePatternsEqual( pattern1, pattern2 )).toBe( false );
        });

        it( "should consider patterns with different event amounts per channel unequal", () => {
            const pattern1 = PatternFactory.create( 16, [[event1], [event2]] );
            const pattern2 = PatternFactory.create( 16, [[event1], [event1, event2]] );

            expect( arePatternsEqual( pattern1, pattern2 )).toBe( false );
        });

        it( "should consider patterns with different event amounts across channels unequal", () => {
            const pattern1 = PatternFactory.create( 16, [[event1], []] );
            const pattern2 = PatternFactory.create( 16, [[event1]] );

            expect( arePatternsEqual( pattern1, pattern2 )).toBe( false );
        });

        it( "should consider patterns with equal events positioned differently per channel unequal", () => {
            const pattern1 = PatternFactory.create( 16, [[event1, event2]] );
            const pattern2 = PatternFactory.create( 16, [[event2, event1]] );

            expect( arePatternsEqual( pattern1, pattern2 )).toBe( false );
        });

        it( "should consider patterns with equal events positioned differently with undefined values per channel unequal", () => {
            const pattern1 = PatternFactory.create( 16, [[event1, undefined, event2]] );
            const pattern2 = PatternFactory.create( 16, [[event1, event2, undefined]] );

            expect( arePatternsEqual( pattern1, pattern2 )).toBe( false );
        });

        it( "should consider patterns with equal events positioned in the same channel position equal", () => {
            const pattern1 = PatternFactory.create( 16, [[event1, event2]] );
            const pattern2 = PatternFactory.create( 16, [[event1, event2]] );

            expect( arePatternsEqual( pattern1, pattern2 )).toBe( true );
        });

        it( "should consider patterns with equal events positioned in the same channels position equal", () => {
            const pattern1 = PatternFactory.create( 16, [[event1, event2, undefined], [event3, event2]] );
            const pattern2 = PatternFactory.create( 16, [[event1, event2, undefined], [event3, event2]] );

            expect( arePatternsEqual( pattern1, pattern2 )).toBe( true );
        });
    });
});
