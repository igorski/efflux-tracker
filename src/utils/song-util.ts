/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import type { Track } from "midi-writer-js";
import { ACTION_AUTO_ONLY, ACTION_NOTE_ON } from "@/model/types/audio-event";
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxSong } from "@/model/types/song";
import { getEventLength } from "@/utils/event-util";
import { getMeasureDurationInSeconds } from "@/utils/audio-math";

/**
 * validates whether the song has any pattern content
 */
export const hasContent = ( song: EffluxSong ): boolean => {
    let hasContent = false;
    song.patterns.forEach( pattern => {
        pattern.channels.forEach( channel => {
            if ( channel.find( event => event && event.action !== ACTION_AUTO_ONLY )) {
                hasContent = true;
            }
        });
    });
    return hasContent;
};

/**
 * update the existing offsets for all of the Songs
 * audioEvents within its patterns
 *
 * @param {Array<EffluxPattern>} patterns the Songs patterns
 * @param {number} ratio by which to update the existing values
 */
export const updateEventOffsets = ( patterns: EffluxPattern[], ratio: number ): void => {
    // reverse looping for speed
    let i, j, k, songPattern, channel, pattern;

    i = patterns.length;
    while ( i-- ) {
        songPattern = patterns[ i ];
        j = songPattern.channels.length;

        while ( j-- ) {
            channel = songPattern.channels[ j ];
            k = channel.length;

            while ( k-- ) {
                pattern = channel[ k ];

                if ( pattern && pattern.seq ) {
                    const { seq } = pattern;
                    seq.startMeasureOffset *= ratio;
                    seq.length             *= ratio;
                }
            }
        }
    }
};

/**
 * unset the play state of all of the songs events
 */
export const resetPlayState = ( patterns: EffluxPattern[] ): void => {
    patterns.forEach( pattern => {
        pattern.channels.forEach( channel => {
            channel.forEach( event => {
                if ( event ) {
                    event.seq.playing = false;
                }
            });
        });
    });
};

/**
 * Export song contents for given pattern and instrument range as a MIDI file
 *
 * @param {MidiWriter} midiWriter module (midi-writer-js)
 * @param {EffluxSong} song to export
 * @param {number=} firstOrderIndex optional index of first pattern in the order list to export, defaults to first
 * @param {number=} lastOrderIndex optional index of last pattern in the order list to export, defaults to last
 * @param {number=} firstInstrument optional index of first instrument to export, defaults to first
 * @param {number=} lastInstrument optional index of last instrument to export, defaults to last
 */
export const exportAsMIDI = ( midiWriter: any, song: EffluxSong,
    firstOrderIndex = 0, lastOrderIndex = Infinity, firstInstrument = 0, lastInstrument = Infinity ): void => {
    // create tracks for each instrument
    const midiTracks: Track[] = [];
    song.instruments.forEach( instrument => {
        const track = new midiWriter.Track();
        track.setTempo( song.meta.tempo );
        track.addTrackName( instrument.presetName || instrument.name );
        track.setTimeSignature( 4, 4 );
        midiTracks.push( track );
    });

    // all measures have the same duration (currently...)
    const measureDuration = getMeasureDurationInSeconds( song.meta.tempo );
    // we specify event ranges in ticks (128 ticks == 1 beat)
    const TICKS = ( 128 * 4 ) / measureDuration; // ticks per measure, songs are always in 4/4 time (currently...)

    // walk through all patterns
    song.order.forEach(( patternIndex: number, orderIndex: number ) => {
        // ignore patterns outside of allowed range
        if ( orderIndex < firstOrderIndex || orderIndex > lastOrderIndex ) {
            return;
        }
        const { channels } = song.patterns[ patternIndex ];

        channels.forEach(( events: EffluxAudioEvent[], channelIndex: number ) => {
            events.forEach( event => {
                // only process note-on events
                // TODO: how to process module automations into CC/pitch bend messages
                if ( event?.action !== ACTION_NOTE_ON ) {
                    return;
                }
                // ignore instruments outside of allowed range
                if ( event.instrument < firstInstrument || event.instrument > lastInstrument ) {
                    return;
                }
                const length = getEventLength( event, channelIndex, orderIndex, song );
                const { startMeasureOffset } = event.seq;
                const duration = `T${Math.round( length * TICKS )}`;
                const startTick = Math.round(
                    ((( orderIndex - firstOrderIndex ) * measureDuration ) + startMeasureOffset ) * TICKS
                );
                midiTracks[ event.instrument ].addEvent(
                    new midiWriter.NoteEvent({
                        // NOTE we increment the octave as otherwise MIDI data is generated one octave too low...
                        pitch    : `${event.note}${event.octave + 1}`,
                        duration,
                        startTick
                    })
                );
            });
        });
    });
    return ( new midiWriter.Writer( midiTracks )).dataUri();
};
