/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
import type { EffluxChannel } from "@/model/types/channel";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxSong } from "@/model/types/song";
import { EffluxAudioEvent } from "@/model/types/audio-event";
import { arePatternsEqual } from "@/utils/pattern-util";
import EventUtil from "@/utils/event-util";

export default {
    /**
     * Inserts given patternIndex inside given order list at given orderIndex
     */
    addPatternAtIndex( order: EffluxPatternOrder, orderIndex: number, patternIndex: number ): EffluxPatternOrder {
        const front = order.slice( 0, orderIndex );
        const back  = order.slice( orderIndex );

        front.push( patternIndex );

        return front.concat( back );
    },

    removePatternAtIndex( order: EffluxPatternOrder, orderIndex: number ): EffluxPatternOrder {
        const newOrder = [ ...order ];
        newOrder.splice( orderIndex, 1 );

        return newOrder;
    },

    removeAllPatternInstances( order: EffluxPatternOrder, patternIndex: number ): EffluxPatternOrder {
        return order.filter( entryNum => entryNum !== patternIndex );
    },
};

/**
 * Songs created without pattern order can convert their existing patterns into
 * an order list. This will also deduplicate cloned patterns.
 */
export const convertLegacy = ( song: EffluxSong ): EffluxSong => {
    let order: EffluxPatternOrder = new Array( song.patterns.length );

    const findDuplicates = ( song: EffluxSong, patternIndex: number ): number[] => {
        const out: number[] = [];
        const pattern = song.patterns[ patternIndex ];

        for ( let i = patternIndex + 1; i < song.patterns.length; ++i ) {
            const comparePattern = song.patterns[ i ];
            if ( arePatternsEqual( pattern, comparePattern )) {
                out.push( i );
            }
        }
        return out;
    };

    const remapped: Map<number, number> = new Map();
    let splicable: number[] = [];
    for ( let patternIndex = 0, totalPatterns = song.patterns.length; patternIndex < totalPatterns; ++patternIndex ) {
        const duplicates = findDuplicates( song, patternIndex );
        let l = duplicates.length;
        // if duplicates are found, add their indices to the Map so we can replace them later
        while ( l-- > 0 ) {
            const duplicateIndex = duplicates[ l ];
            if ( !remapped.has( duplicateIndex )) {
                remapped.set( duplicateIndex, patternIndex );
            }
        }
        splicable = splicable.concat( duplicates );
    }

    // remap the pattern indices in the order to reuse patterns
    for ( let i = 0, l = song.patterns.length; i < l; ++i ) {
        order[ i ] = remapped.get( i ) ?? i;
    }

    // splice the duplicate patterns for the patterns list
    splicable = [ ...new Set( splicable )].sort(( a, b ) => a - b );
    let l = splicable.length;
    while ( l-- > 0 ) {
        const spliceIndex = splicable[ l ];
        song.patterns.splice( spliceIndex, 1 );
        // and update the pattern indices in the order list (as pattern list length is shifted downwards)
        order = order.map(( index: number ) => index > spliceIndex ? index - 1 : index );
    }
    song.order = order;

    song.patterns.forEach(( pattern: EffluxPattern /*, patternIndex: number */ ) => {
        pattern.channels.forEach(( channel: EffluxChannel ) => {
            channel.forEach(( event: EffluxAudioEvent, eventIndex: number ) => {
                if ( !event ) {
                    return;
                }
                EventUtil.setPosition( event, pattern, eventIndex, song.meta.tempo );
            });
        });
    });

    return song;
};
