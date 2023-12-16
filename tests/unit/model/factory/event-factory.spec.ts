import { describe, it, expect } from "vitest";
import { PITCH_UP } from "@/definitions/automatable-parameters";
import EventFactory from "@/model/factories/event-factory";
import EventValidator from "@/model/validators/event-validator";
import { ACTION_NOTE_ON } from "@/model/types/audio-event";

describe("EventFactory", () => {
    it( "should be able to generate a valid Event Object", () => {
        const event = EventFactory.create();

        expect( EventValidator.isValid( event )).toBe( true );
    });

    it( "should by default generate an Event without a module parameter automation", () => {
        const event = EventFactory.create();

        expect( event.mp ).toBeUndefined();
    });

    it( "should be able to generate an Event from the optionally provided arguments", () => {
        const event = EventFactory.create( 2, "C", 3, ACTION_NOTE_ON, {
            module: PITCH_UP,
            value: 77,
            glide: true,
        });

        expect( event.mp ).toEqual({ module: PITCH_UP, value: 77, glide: true });
        expect( event.instrument ).toEqual( 2 );
        expect( event.note ).toEqual( "C" );
        expect( event.octave ).toEqual( 3 );
    });

    it( "should be able to apply a valid module parameter automation Object to an event", () => {
        const event = EventFactory.create();
        event.mp = EventFactory.createModuleParam( "foo", 10, true );

        expect( EventValidator.isValid( event )).toBe( true );
    });
});
