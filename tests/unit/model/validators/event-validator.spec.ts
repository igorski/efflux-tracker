import { describe, it, expect } from "vitest";
import EventFactory from "@/model/factories/event-factory";
import EventValidator from "@/model/validators/event-validator";

describe("EventValidator", () => {

    /* actual unit tests */

    it("should not validate empty AudioEvents", () => {
        const audioEvent = EventFactory.create();
        expect(EventValidator.hasContent(audioEvent)).toBe(false);
    });

    it("should not validate AudioEvents with invalid data types", () => {
        const audioEvent = EventFactory.create();

        // @ts-expect-error
        audioEvent.instrument = "foo";

        expect(EventValidator.hasContent(audioEvent)).toBe(false); // expected AudioEvent not be valid as instrument was not of numeric type

        audioEvent.instrument = 1;
        // @ts-expect-error
        audioEvent.note = 2;

        expect(EventValidator.hasContent(audioEvent)).toBe(false); // expected AudioEvent not be valid as note was not of string type

        audioEvent.note = "C";
        // @ts-expect-error
        audioEvent.octave = "bar";

        expect(EventValidator.hasContent(audioEvent)).toBe(false); // expected AudioEvent not be valid as octave was not of numeric type
    });

    it("should not validate AudioEvents with out of range data types", () => {
        const audioEvent = EventFactory.create();

        audioEvent.instrument = 0;
        audioEvent.note = "C";
        audioEvent.octave = 0;

        expect(EventValidator.hasContent(audioEvent)).toBe(false); // expected AudioEvent not be valid as octave was below allowed threshold

        audioEvent.octave = 9;

        expect(EventValidator.hasContent(audioEvent)).toBe(false); // expected AudioEvent not be valid as octave was above allowed threshold
    });

    it("should validate AudioEvents with correct note data", () => {
        const audioEvent = EventFactory.create();

        audioEvent.instrument = 0;
        audioEvent.note = "C";
        audioEvent.octave = 3;

        expect(EventValidator.hasContent(audioEvent)).toBe(true);
    });
});
