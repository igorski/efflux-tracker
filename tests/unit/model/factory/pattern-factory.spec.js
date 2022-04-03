/**
 * @jest-environment jsdom
 */
import Config from "@/config";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import { serialize } from "@/model/serializers/pattern-serializer";
import PatternValidator from "@/model/validators/pattern-validator";
import { ASSEMBLER_VERSION } from "@/services/song-assembly-service";

describe( "PatternFactory", () => {
    it( "should be able to generate a valid pattern", () => {
        const steps = Math.round(1 + ( Math.random() * 32 ));
        const pattern = PatternFactory.create(steps);

        expect(PatternValidator.isValid(pattern)).toBe(true);
    });

    it( "should be able to generate an empty pattern template for any requested step amount", () => {
        const steps = Math.round(1 + ( Math.random() * 32 ));
        const pattern = PatternFactory.create(steps);

        expect(typeof pattern).toBe("object");

        expect(steps).toEqual(pattern.steps);
        expect(Config.INSTRUMENT_AMOUNT).toEqual(pattern.channels.length);
        expect(steps).toEqual(pattern.channels[0].length);
        expect(pattern.channels[0].length).toEqual(pattern.channels[1].length);
    });

    it( "should by default generate an empty pattern template for a 16 step sequence", () => {
        const pattern = PatternFactory.create();
        expect(16).toEqual(pattern.steps);
    });

    it( "should be able to generate a pattern with optionally passed channel list", () => {
        const channels = [[ 0, 1, 2 ], [ 1, 1, 0 ]];
        const pattern = PatternFactory.create( 4, channels );
        expect( pattern.channels ).toEqual( channels );
    });

    it( "should be able to merge equal length patterns", () => {
        const pattern1 = PatternFactory.create();
        const pattern2 = PatternFactory.create();

        // generate some note content

        let p1channel1 = pattern1.channels[0];
        let p2channel1 = pattern2.channels[0];

        const expected1 = p1channel1[0] = EventFactory.createAudioEvent(1, "C#", 4, 1);
        const expected2 = p1channel1[4] = EventFactory.createAudioEvent(1, "D", 5, 1);
        const expected3 = p2channel1[2] = EventFactory.createAudioEvent(1, "E", 6, 1);
        const expected4 = p2channel1[6] = EventFactory.createAudioEvent(1, "F", 7, 1);

        // merge patterns

        const merged = PatternFactory.mergePatterns(pattern1, pattern2, 0);

        // assert results

        const m1channel1 = merged.channels[0];

        expect(expected1).toEqual(m1channel1[0]);
        expect(expected2).toEqual(m1channel1[4]);
        expect(expected3).toEqual(m1channel1[2]);
        expect(expected4).toEqual(m1channel1[6]);
    });

    it( "should be able to merge unequal length patterns when source is larger than target", () => {
        const pattern1 = PatternFactory.create(16);
        const pattern2 = PatternFactory.create(32);

        // generate some note content

        let p1channel1 = pattern1.channels[0];
        let p2channel1 = pattern2.channels[0];

        const expected1 = p1channel1[0] = EventFactory.createAudioEvent(1, "C#", 4, 1);
        const expected2 = p1channel1[4] = EventFactory.createAudioEvent(1, "D", 5, 1);
        const expected3 = p2channel1[15] = EventFactory.createAudioEvent(1, "E", 6, 1);
        const expected4 = p2channel1[29] = EventFactory.createAudioEvent(1, "F", 7, 1);

        // merge patterns

        const merged = PatternFactory.mergePatterns(pattern1, pattern2, 0);
        const m1channel1 = merged.channels[0];

        // assert results

        expect(expected1).toEqual(m1channel1[0]);
        expect(expected2).not.toEqual(m1channel1[4]);
        expect(expected2).toEqual(m1channel1[8]);
        expect(expected3).toEqual(m1channel1[15]);
        expect(expected4).toEqual(m1channel1[29]);
    });


    it( "should be able to merge unequal length patterns when target is larger than the source", () => {
        const pattern1 = PatternFactory.create(32);
        const pattern2 = PatternFactory.create(16);

        // generate some note content

        let p1channel1 = pattern1.channels[0];
        let p2channel1 = pattern2.channels[0];

        const expected1 = p1channel1[15] = EventFactory.createAudioEvent(1, "E", 6, 1);
        const expected2 = p1channel1[29] = EventFactory.createAudioEvent(1, "F", 7, 1);
        const expected3 = p2channel1[0] = EventFactory.createAudioEvent(1, "C#", 4, 1);
        const expected4 = p2channel1[4] = EventFactory.createAudioEvent(1, "D", 5, 1);

        // merge patterns

        const merged = PatternFactory.mergePatterns(pattern1, pattern2, 0);

        // assert results

        p1channel1 = pattern1.channels[0];
        const m1channel1 = merged.channels[0];

        expect(expected1).toEqual(p1channel1[15]);
        expect(expected2).toEqual(p1channel1[29]);
        expect(expected3).toEqual(m1channel1[0]);
        expect(expected4).toEqual(m1channel1[8]);
    });

    it( "should be able to update the events startMeasure indices when merging patterns at specific target index", () => {
        const pattern1 = PatternFactory.create(16);
        const pattern2 = PatternFactory.create(16);

        // generate some note content

        const p2channel1 = pattern2.channels[0];
        p2channel1[15] = EventFactory.createAudioEvent(1, "E", 6, 1);

        // merge patterns

        const targetPatternIndex = 1;
        const merged = PatternFactory.mergePatterns(pattern1, pattern2, targetPatternIndex);

        const m1channel1 = merged.channels[0];

        // assert results
        // expect target pattern index of cloned event to equal the pattern index it was pasted into
        expect(targetPatternIndex).toEqual(m1channel1[15].seq.startMeasure);
    });

    it( "should be able to serialize a pattern list without loss of data", () => {
        const pattern1 = PatternFactory.create( 16 );
        const pattern2 = PatternFactory.create( 32 );

        const patterns = [ pattern1, pattern2 ];
        const xtk = {};

        serialize( xtk, patterns );
        expect( PatternFactory.deserialize( xtk, ASSEMBLER_VERSION, 120 )).toEqual( patterns );
    });
});
