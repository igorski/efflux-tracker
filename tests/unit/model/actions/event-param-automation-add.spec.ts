import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Store } from "vuex";
import { FILTER_FREQ, FILTER_Q } from "@/definitions/automatable-parameters";
import addEventParamAutomation from "@/model/actions/event-param-automation-add";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxAudioEvent } from "@/model/types/audio-event";
import { type EffluxChannel } from "@/model/types/channel";
import { type EffluxSong } from "@/model/types/song";
import { type EffluxState } from "@/store";
import { createAndInsertEvent } from "../../helpers";
import { createMockStore } from "../../mocks";

describe( "event parameter automation add action", () => {
    let song: EffluxSong;
    let store: Store<EffluxState>;
    let channel: EffluxChannel; 
    let event: EffluxAudioEvent;

    const orderIndex = 0;
    const channelIndex = 0;
    const step = 2;
    let patternIndex: number;

    const NEW_MP = {
        module: FILTER_Q,
        value: 99,
        glide: true,
    };

    beforeEach(() => {
        store = createMockStore();
        song = SongFactory.create( 8 );
        store.state.song.activeSong = song;
        
        patternIndex = song.order[ orderIndex ];

        song.patterns[ patternIndex ] = PatternFactory.create( 8 );
        channel = song.patterns[ patternIndex ].channels[ channelIndex ];
        
        event = createAndInsertEvent( step, song, patternIndex, channelIndex );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should be able to add automation to an event that did not have any existing automation", () => {
        addEventParamAutomation( store, patternIndex, channelIndex, step, NEW_MP );

        expect( event.mp ).toEqual( NEW_MP );
    });

    it( "should be able to replace the existing automation for an event", () => {
        event.mp = {
            module: FILTER_FREQ,
            value: 77,
            glide: false,
        };

        addEventParamAutomation( store, patternIndex, channelIndex, step, NEW_MP );

        expect( event.mp ).toEqual( NEW_MP );
    });

    it( "should remove the automation on undo, when no automation existed before", () => {
        const { undo } = addEventParamAutomation( store, patternIndex, channelIndex, step, NEW_MP );
        
        undo();
     
        expect( event.mp ).toBeUndefined();
    });

    it( "should restore the original automation on undo", () => {
        event.mp = {
            module: FILTER_FREQ,
            value: 77,
            glide: false,
        };
        const orgMp = { ...event.mp };

        const { undo } = addEventParamAutomation( store, patternIndex, channelIndex, step, NEW_MP );
        undo();
     
        expect( event.mp ).toEqual( orgMp );
    });
});