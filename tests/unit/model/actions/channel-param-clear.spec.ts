import { describe, it, expect, beforeEach } from "vitest";
import { PITCH_UP, PITCH_DOWN } from "@/definitions/automatable-parameters";
import clearChannelAutomation from "@/model/actions/channel-param-clear";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxAudioEvent, ACTION_AUTO_ONLY, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import type { EffluxSong } from "@/model/types/song";
import { clone } from "@/utils/object-util";

describe( "Channel automation clear action", () => {
    const patternIndex = 0;
    const channelIndex = 0;

    let song: EffluxSong;
    let event1: EffluxAudioEvent;
    let event2: EffluxAudioEvent;
    let event3: EffluxAudioEvent;

    beforeEach(() => {
        song = SongFactory.create();
        song.patterns = [
            PatternFactory.create( 8 )
        ];
        event1 = EventFactory.create( channelIndex, "C", 3, ACTION_NOTE_ON, {
            module: PITCH_UP,
            value: 100,
            glide: true
        });
        event2 = EventFactory.create( channelIndex, "C", 3, ACTION_NOTE_OFF, {
            module: PITCH_DOWN,
            value: 77,
            glide: true
        });
        event3 = EventFactory.create( channelIndex, "C", 3, ACTION_AUTO_ONLY, {
            module: PITCH_UP,
            value: 50,
            glide: false,
        });
        song.patterns[ patternIndex ].channels[ channelIndex ] = [
            event1, 0, event2, 0, event3, 0, 0, 0
        ];
    });

    it( "should keep all existing events minus the automation only ones", () => {
        clearChannelAutomation( song, patternIndex, channelIndex );

        expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual([
            event1, 0, event2, 0, 0, 0, 0, 0
        ]);
    });

    it( "should clear the automations of all noteOn events", () => {
        clearChannelAutomation( song, patternIndex, channelIndex );

        expect( event1.mp ).toBeUndefined();
    });

    it( "should clear the automations of all noteOff events", () => {
        clearChannelAutomation( song, patternIndex, channelIndex );

        expect( event2.mp ).toBeUndefined();
    });

    it( "should restore the original contents on undo", () => {
        const orgChannel = clone( song.patterns[ patternIndex ].channels[ channelIndex ]);

        const { undo } = clearChannelAutomation( song, patternIndex, channelIndex );
        undo();

        expect( song.patterns[ patternIndex ].channels[ channelIndex ]).toEqual( orgChannel );
    });
});