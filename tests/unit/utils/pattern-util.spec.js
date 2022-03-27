/**
 * @jest-environment jsdom
 */
import PatternUtil, { serializePatternFile, deserializePatternFile } from "@/utils/pattern-util";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";

describe( "PatternUtil", () => {
    it( "should be able to add a new pattern at the given insertion index", () => {
        const amount = 10, steps = 16, temp = new Array(amount);
        let patterns = new Array(amount);

        for (let i = 0; i < amount; ++i)
            patterns[i] = temp[i] = PatternFactory.create(steps);

        const insertion = 5;
        patterns = PatternUtil.addPatternAtIndex(patterns, insertion, steps);

        expect(amount + 1).toEqual(patterns.length); // expected pattern list to have expanded in size
        expect(temp[insertion - 1]).toEqual(patterns[insertion - 1]); // expected the last pattern prior to the insertion to equal the original one
        expect(temp[insertion]).toEqual(patterns[insertion + 1]); // expected the first pattern after the insertion to equal the original one at the insertion offset

        expect(temp.indexOf(patterns[insertion])).toEqual(-1); // expected the content inserted at the insertion point not to be present in the original list
    });

    it( "should be able to add the given pattern at the given insertion index", () => {
        const amount = 10, steps = 16, temp = new Array(amount);
        let patterns = new Array(amount);

        for (let i = 0; i < amount; ++i)
            patterns[i] = temp[i] = PatternFactory.create(steps);

        const patternToInsert = PatternFactory.create(steps);
        const insertion = 5;

        PatternUtil.addPatternAtIndex(patterns, insertion, steps, patternToInsert);
        expect(temp[insertion]).toEqual(patternToInsert); // expected the content inserted at the insertion point to be the given pattern
    });

    it( "should update the start indices of all events present in the patterns after the insertion point", () => {
        const amount = 3, steps = 16, patterns = new Array(amount);
        let i;

        for (i = 0; i < amount; ++i)
            patterns[i] = PatternFactory.create(steps);

        // generate some events

        const insertion = 1;

        const event1 = EventFactory.createAudioEvent();
        const event2 = EventFactory.createAudioEvent();

        event1.seq.startMeasure = 0;
        event1.seq.endMeasure = 0;
        event2.seq.startMeasure = insertion + 1;
        event2.seq.endMeasure = insertion + 1;

        patterns[0].channels[0][0] = event1;
        patterns[insertion + 1].channels[0][0] = event2;

        PatternUtil.addPatternAtIndex(patterns, insertion, steps);

        expect(0).toEqual(event1.seq.startMeasure); // expected event 1 start measure to have remained unchanged as it was present before the insertion point
        expect(0).toEqual(event1.seq.endMeasure); // expected event 1 end measure to have remained unchanged as it was present before the insertion point
        expect(insertion + 2).toEqual(event2.seq.startMeasure); // expected event 2 start measure to have incremented as it was present after the insertion point
        expect(insertion + 2).toEqual(event2.seq.endMeasure); // expected event 2 end measure to have incremented as it was present after the insertion point
    });

    it( "should be able to add a new pattern with a unique amount of steps different to the existing pattern step amounts", () => {
        const amount = 10, steps = 16, newSteps = 32, insertion = 5;
        let patterns = new Array(amount), i;

        for (i = 0; i < amount; ++i)
            patterns[i] = PatternFactory.create(steps);

        patterns = PatternUtil.addPatternAtIndex(patterns, insertion, newSteps);

        for (i = 0; i < ( amount + 1 ); ++i) {
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
        let patterns = new Array(amount);

        for (let i = 0; i < amount; ++i)
            patterns[i] = temp[i] = PatternFactory.create(16);

        const deletion = 5;
        patterns = PatternUtil.removePatternAtIndex(patterns, deletion);

        expect(amount - 1).toEqual(patterns.length); // expected pattern list to have contracted in size
        expect(temp[deletion - 1]).toEqual(patterns[deletion - 1]); // expected the last pattern prior to the removal to equal the original one
        expect(temp[deletion + 1]).toEqual(patterns[deletion]); // expected the first pattern after the removal to equal the original one at the deletion index
    });

    it( "should update the start indices of all events present in the patterns after the deletion index", () => {
        const amount = 3, patterns = new Array(amount);
        let i;

        for (i = 0; i < amount; ++i)
            patterns[i] = PatternFactory.create(16);

        // generate some events

        const deletion = 1;

        const event1 = EventFactory.createAudioEvent();
        const event2 = EventFactory.createAudioEvent();

        event1.seq.startMeasure = 0;
        event1.seq.endMeasure = 0;
        event2.seq.startMeasure = deletion + 1;
        event2.seq.endMeasure = deletion + 1;

        patterns[0].channels[0][0] = event1;
        patterns[deletion + 1].channels[0][0] = event2;

        PatternUtil.removePatternAtIndex(patterns, deletion);

        expect(0).toEqual(event1.seq.startMeasure); // expected event 1 start measure to have remained unchanged as it was present before the removal point
        expect(0).toEqual(event1.seq.endMeasure); // expected event 1 end measure to have remained unchanged as it was present before the removal point
        expect(deletion).toEqual(event2.seq.startMeasure); // expected event 2 start measure to have decremented as it was present after the removal point
        expect(deletion).toEqual(event2.seq.endMeasure); // expected event 2 end measure to have decremented as it was present after the removal point
    });

    describe( "when serializing and deserializing a pattern into a encoded file", () => {
        const patternSteps = 4;
        const patterns     = [];

        beforeAll(() => {
            const pattern = PatternFactory.create( patternSteps );
            pattern.channels.forEach(( channel, channelIndex ) => {
                for ( let i = 0; i < 4; i += 2 ) {
                    channel[ i ] = EventFactory.createAudioEvent( channelIndex );
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
});
