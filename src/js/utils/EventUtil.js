/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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
"use strict";

module.exports =
{
    /**
     * update the position properties of given AudioEvent
     *
     * @public
     * @param {AUDIO_EVENT} event
     * @param {PATTERN} pattern
     * @param {number} patternNum index of the pattern within the entire Song (e.g. "measure")
     * @param {number} patternStep index of the audioEvent within the pattern
     * @param {number} tempo in BPM of the song
     * @param {number=} length optional duration (in seconds) of the audioEvent, defaults to
     *                  the smallest unit available for given patterns length
     */
    setPosition( event, pattern, patternNum, patternStep, tempo, length )
    {
        const measureLength = calculateMeasureLength( tempo );
        const eventOffset   = ( patternStep / pattern.steps ) * measureLength;

        event.seq.length             = ( typeof length === "number" ) ? length : ( 1 / pattern.steps ) * measureLength;
        event.seq.startMeasure       = patternNum;
        event.seq.startMeasureOffset = eventOffset;
        event.seq.endMeasure         = patternNum + Math.abs( Math.ceil((( eventOffset + length ) - measureLength ) / measureLength ));
    },

    /**
     * add a (new) event at the correct position within the
     * LinkedList queried by the SequencerController
     *
     * @param {AUDIO_EVENT} event
     * @param {number} channelIndex index of the channel the event belongs to
     * @param {Object} song
     * @param {Array.<LinkedList>} lists
     */
    linkEvent( event, channelIndex, song, lists )
    {
        const list     = lists[ channelIndex ];
        const existed  = list.getNodeByData( event );
        const patterns = song.patterns;

        if ( existed )
            list.remove( existed );

        // find previous event through the pattern list

        let foundEvent = false, compareEvent, channel, i, l, j, jl, insertedNode;

        for ( i = event.seq.startMeasure, l = patterns.length; i < l; ++i )
        {
            channel = patterns[ i ].channels[ channelIndex ];

            for ( j = 0, jl = channel.length; j < jl; ++j )
            {
                compareEvent = channel[ j ];

                if ( !foundEvent ) {

                    if ( compareEvent === event )
                        foundEvent = true;
                }
                else {

                    // any event (with an action) beyond this point is
                    // the "next" event in the list for given event

                    if ( compareEvent && compareEvent.action > 0 ) {

                        insertedNode = list.addBefore( compareEvent, event );
                        updatePreviousEventLength( insertedNode, song.meta.tempo );
                        return insertedNode;
                    }
                }
            }
        }
        insertedNode = list.add( event ); // is new tail
        updatePreviousEventLength( insertedNode, song.meta.tempo );

        return insertedNode;
    },

    /**
     * create LinkedLists for all events present in given
     * pattern lists. The SequencerController will read
     * from the LinkedList for a better performance
     *
     * @public
     * @param {Array.<PATTERN>} patterns
     * @param {Array.<LinkedList>} lists
     */
    linkEvents( patterns, lists )
    {
        lists.forEach(( list, channelIndex ) => {

            // clear existing list contents
            list.flush();

            patterns.forEach(( pattern ) => {
                pattern.channels[ channelIndex ].forEach(( event ) => {

                    if ( event )
                        list.add( event );
                });
            });
        });
    },

    /**
     * clears the AudioEvent at requested step position in
     * the given channel for the given pattern
     *
     * @public
     * @param {Object} song
     * @param {number} patternIndex
     * @param {number} channelNum
     * @param {number} step
     * @param {LinkedList=} list
     */
    clearEvent( song, patternIndex, channelNum, step, list )
    {
        const pattern = song.patterns[ patternIndex ];
        const channel = pattern.channels[ channelNum ];

        if ( list ) {

            const listNode = list.getNodeByData( channel[ step ]);

            if ( listNode ) {

                const next = listNode.next;
                listNode.remove();

                if ( next )
                    updatePreviousEventLength( next, song.meta.tempo );
            }
        }
        delete channel[ step ];
    },

    /**
     * retrieve the first AudioEvent available before
     * given step in given channel event list
     *
     * @public
     * @param {Array.<AUDIO_EVENT|null>} channelEvents
     * @param {number} step
     * @return {AUDIO_EVENT|null}
     */
    getFirstEventBeforeStep( channelEvents, step )
    {
        let previousEvent;
        for ( let i = step - 1; i >= 0; --i ) {
            previousEvent = channelEvents[ i ];
            if ( previousEvent )
                return previousEvent;
        }
        return null;
    }
};

function updatePreviousEventLength( eventListNode, songTempo ) {

    if ( eventListNode.previous ) {

        const event     = eventListNode.data;
        const prevEvent = eventListNode.previous.data;

        if ( prevEvent.seq.startMeasure === event.seq.startMeasure ) {
            prevEvent.seq.length = (
                ( event.seq.startMeasureOffset - prevEvent.seq.startMeasureOffset )
            );
        }
        else {

            const currentStartMeasure = event.seq.startMeasure;
            const measureLength       = calculateMeasureLength( songTempo );
            let previousStartMeasure  = prevEvent.seq.startMeasure;
            let length = measureLength - prevEvent.seq.startMeasureOffset;
            let i = 0;

            while ( previousStartMeasure < currentStartMeasure ) {

                if ( i > 0 )
                    length += measureLength;

                ++previousStartMeasure;
                ++i;
            }
            prevEvent.seq.length = length + event.seq.startMeasureOffset;
        }
    }
}

function calculateMeasureLength( tempo ) {

    return ( 60 / tempo ) * 4; // TODO: the 4 is implying all songs will be in 4/4 time
}
