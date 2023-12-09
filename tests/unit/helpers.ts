import { type EffluxAudioEvent, ACTION_NOTE_ON } from "@/model/types/audio-event";
import type { EffluxSong } from "@/model/types/song";
import EventFactory from "@/model/factories/event-factory";
import EventUtil from "@/utils/event-util";

export function createAndInsertEvent( step: number, song: EffluxSong, patternIndex: number, channelIndex: number, action = ACTION_NOTE_ON ): EffluxAudioEvent {
    const event = EventFactory.create( channelIndex, "C", 3, action );
    const pattern = song.patterns[ patternIndex ];

    pattern.channels[ channelIndex ][ step ] = event;

    EventUtil.setPosition( event, pattern, step, song.meta.tempo );

    return event;
}
