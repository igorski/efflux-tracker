import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Store } from "vuex";
import { FILTER_FREQ } from "@/definitions/automatable-parameters";
import deleteEventParamAutomation from "@/model/actions/event-param-automation-delete";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxAudioEvent } from "@/model/types/audio-event";
import { type EffluxChannel } from "@/model/types/channel";
import { type EffluxSong } from "@/model/types/song";
import { type EffluxState } from "@/store";
import { createAndInsertEvent } from "../../helpers";
import { createMockStore } from "../../mocks";

describe( "event parameter automation delete action", () => {
    let song: EffluxSong;
    let store: Store<EffluxState>;
    let channel: EffluxChannel; 
    let event: EffluxAudioEvent;

    const orderIndex = 0;
    const channelIndex = 0;
    const step = 2;
    let patternIndex: number;

    beforeEach(() => {
        store = createMockStore();
        song = SongFactory.create( 8 );
        store.state.song.activeSong = song;
        
        patternIndex = song.order[ orderIndex ];

        song.patterns[ patternIndex ] = PatternFactory.create( 8 );
        channel = song.patterns[ patternIndex ].channels[ channelIndex ];
        
        event = createAndInsertEvent( step, song, patternIndex, channelIndex );
        event.mp = {
            module: FILTER_FREQ,
            value: 77,
            glide: true,
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should be able to remove the existing automations for an event", () => {
        deleteEventParamAutomation( store, patternIndex, channelIndex, step );

        expect( event.mp ).toBeUndefined();
    });

    it( "should restore the deleted automation on undo", () => {
        const orgMp = { ...event.mp };

        const { undo } = deleteEventParamAutomation( store, patternIndex, channelIndex, step );
        undo();
     
        expect( event.mp ).toEqual( orgMp );
    });
});