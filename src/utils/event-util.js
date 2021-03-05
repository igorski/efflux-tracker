/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2020 - https://www.igorski.nl
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
import Vue          from 'vue';
import EventFactory from '@/model/factories/event-factory';

import { getMeasureDurationInSeconds } from './audio-math';

const EventUtil =
{
    /**
     * update the position properties of given AudioEvent
     *
     * @param {AUDIO_EVENT} event
     * @param {PATTERN} pattern
     * @param {number} patternNum index of the pattern within the entire Song (e.g. "measure")
     * @param {number} patternStep index of the audioEvent within the pattern
     * @param {number} tempo in BPM of the song
     * @param {number=} length optional duration (in seconds) of the audioEvent, defaults to
     *                  the smallest unit available for given patterns length
     */
    setPosition( event, pattern, patternNum, patternStep, tempo, length ) {
        const measureLength = calculateMeasureLength( tempo );
        const eventOffset   = ( patternStep / pattern.steps ) * measureLength;
        const { seq }       = event;

        if ( typeof length !== "number" ) {
           length = ( 1 / pattern.steps ) * measureLength;
        }
        Vue.set(seq, 'length', length);
        Vue.set(seq, 'startOffset', patternNum * getMeasureDurationInSeconds( tempo ));
        Vue.set(seq, 'startMeasure', patternNum);
        Vue.set(seq, 'startMeasureOffset', eventOffset);
        Vue.set(seq, 'endMeasure', patternNum + Math.abs( Math.ceil((( eventOffset + length ) - measureLength ) / measureLength )));
    },
    /**
     * add a (new) event at the correct position within the
     * LinkedList queried by the SequencerController
     *
     * @param {AUDIO_EVENT} event
     * @param {number} channelIndex index of the channel the event belongs to
     * @param {SONG} song
     * @param {Array<LinkedList>} lists
     */
    linkEvent( event, channelIndex, song, lists ) {
        const list     = lists[ channelIndex ];
        const existed  = list.getNodeByData( event, compareEvent => {
            // we use a comparison function on instrument and offset
            // as we might be linking an updated event (thus with changed properties/reference)
            return compareEvent.instrument             === event.instrument &&
                   compareEvent.seq.startMeasure       === event.seq.startMeasure &&
                   compareEvent.seq.startMeasureOffset === event.seq.startMeasureOffset
        });
        if ( existed ) list.remove( existed );

        // find previous and next events through the pattern list

        let insertedNode;
        const nextEvent = EventUtil.getFirstEventAfterEvent(
            song.patterns, event.seq.startMeasure, channelIndex, event
        );
        if ( nextEvent ) {
            insertedNode = list.addBefore( nextEvent, event );
            // update this event duration when the next event is known
            updateLengthDelta( event, insertedNode.next.data, song.meta.tempo );
        } else {
            insertedNode = list.add( event ); // event is new tail
        }
        updatePreviousEventLength( insertedNode, song.meta.tempo );

        return insertedNode;
    },
    /**
     * create LinkedLists for all events present in given
     * pattern lists. The sequencer will read
     * from the LinkedList for more performant results
     *
     * @param {Array<PATTERN>} patterns
     * @param {Array<LinkedList>} lists
     */
    linkEvents( patterns, lists ) {
        lists.forEach(( list, channelIndex ) => {
            list.flush(); // clear existing list contents
            patterns.forEach(pattern => {
                pattern.channels[ channelIndex ].forEach(event => {
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
     * @param {SONG} song
     * @param {number} patternIndex
     * @param {number} channelNum
     * @param {number} step
     * @param {LinkedList=} list
     */
    clearEvent( song, patternIndex, channelNum, step, list ) {
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
        Vue.set(channel, step, 0);
    },
    /**
     * Brute force way to remove an event from a song
     *
     * @param {SONG} song
     * @param {AUDIO_EVENT} event
     * @param {Array<LinkedList>} lists
     */
    clearEventByReference( song, event, lists ) {
        let found = false;
        song.patterns.forEach(( pattern, patternIndex ) => {
            pattern.channels.forEach(( channel, channelIndex ) => {

                if ( found )
                    return;

                channel.forEach(( compareEvent, eventIndex ) => {
                    if ( compareEvent === event ) {
                        EventUtil.clearEvent( song, patternIndex, channelIndex, eventIndex, lists[ channelIndex ]);
                        found = true;
                    }
                });
            });
        });
    },
    /**
     * retrieve the first AudioEvent before given step in given channel event list
     *
     * @param {Array<AUDIO_EVENT>} channelEvents
     * @param {number} step
     * @param {Function=} optCompareFn optional function to use
     *                    to filter events by
     * @return {AUDIO_EVENT|null}
     */
    getFirstEventBeforeStep( channelEvents, step, optCompareFn ) {
        let previousEvent;
        for ( let i = step - 1; i >= 0; --i ) {
            previousEvent = channelEvents[ i ];
            if ( previousEvent &&
                ( typeof optCompareFn !== 'function' || optCompareFn( previousEvent ))) {
                return previousEvent;
            }
        }
        return null;
    },
    /**
     * retrieve the first AudioEvent before given event in the same or previous patterns channel
     *
     * @param {Array<PATTERN>} patterns
     * @param {number} patternIndex pattern the event belongs to (e.g. its startMeasure)
     * @param {number} channelIndex channel the event belongs to
     * @param {AUDIO_EVENT} event
     * @param {Function=} optCompareFn optional function to use
     *                    to filter events by
     * @return {AUDIO_EVENT|null}
     */
    getFirstEventBeforeEvent( patterns, patternIndex, channelIndex, event, optCompareFn ) {
        let pattern, previousEvent;
        for ( let p = patternIndex; p >= 0; --p ) {
            pattern = patterns[ p ];
            const channelEvents = pattern.channels[ channelIndex ];
            const start = channelEvents.includes( event ) ? channelEvents.indexOf( event ) : channelEvents.length;
            for ( let i = start; i >= 0; --i ) {
                previousEvent = channelEvents[ i ];
                if ( previousEvent && previousEvent !== event &&
                    ( typeof optCompareFn !== 'function' || optCompareFn( previousEvent ))) {
                    return previousEvent;
                }
            }
        }
        return null;
    },
    /**
     * retrieve the first AudioEvent after given event in the same or previous patterns channel
     *
     * @param {Array<PATTERN>} patterns
     * @param {number} patternIndex pattern the event belongs to (e.g. its startMeasure)
     * @param {number} channelIndex channel the event belongs to
     * @param {AUDIO_EVENT} event
     * @param {Function=} optCompareFn optional function to use
     *                    to filter events by
     * @return {AUDIO_EVENT|null}
     */
    getFirstEventAfterEvent( patterns, patternIndex, channelIndex, event, optCompareFn ) {
        let pattern, nextEvent;
        for ( let p = patternIndex, pl = patterns.length; p < pl; ++p ) {
            pattern = patterns[ p ];
            const channelEvents = pattern.channels[ channelIndex ];
            const start = channelEvents.includes( event ) ? channelEvents.indexOf( event ) : 0;
            for ( let i = start, cl = channelEvents.length; i < cl; ++i ) {
                nextEvent = channelEvents[ i ];
                if ( nextEvent && nextEvent !== event &&
                    ( typeof optCompareFn !== 'function' || optCompareFn( nextEvent ))) {
                    return nextEvent;
                }
            }
        }
        return null;
    },
    /**
     * create a smooth glide for the module parameter changes from
     * one slot to another
     *
     * @param {SONG} song
     * @param {number} patternIndex
     * @param {number} channelIndex
     * @param {number} eventIndex
     * @param {Array<LinkedList>} lists
     * @return {Array<AUDIO_EVENT>|null} created audio events
     */
    glideModuleParams( song, patternIndex, channelIndex, eventIndex, lists ) {
        const list               = lists[ channelIndex ];
        const firstPattern       = song.patterns[ patternIndex ];
        const firstPatternEvents = firstPattern.channels[ channelIndex ];
        const firstEvent         = firstPatternEvents[ eventIndex ];
        const firstParam         = firstEvent.mp;

        const listNode = list.getNodeByData( firstEvent );
        let secondEvent, secondParam;
        let compareNode;

        if ( !firstParam || !listNode )
            return null;

        compareNode = listNode.next;

        while ( compareNode ) {

            secondEvent = compareNode.data;
            secondParam = secondEvent.mp;

            // ignore events without a module parameter change

            if ( secondParam ) {

                // if new event has a module parameter change for the
                // same module, we have found our second event

                if ( secondParam.module === firstParam.module )
                    break;
                else
                    return null;
            }
            // keep iterating through the linked list
            compareNode = compareNode.next;
        }

        if ( !secondParam )
            return null;

        // ensure events glide their module parameter change

        Vue.set(firstParam,  'glide', true);
        Vue.set(secondParam, 'glide', true);

        // find distance (in steps) between these two events
        // TODO: keep patterns' optional resolution differences in mind
        let eventFound = false;
        let prevEvent = firstEvent;
        const events = [];

        const addOrUpdateEvent = ( evt, pattern, patternIndex, channel, eventIndex ) => {
            if ( typeof evt !== 'object' ) {
                // event didn't exist... create it, insert into the channel and update LinkedList
                evt = EventFactory.createAudioEvent( firstEvent.instrument );
                Vue.set(channel, eventIndex, evt);
                list.addAfter( prevEvent, evt );
                EventUtil.setPosition( evt, pattern, patternIndex, eventIndex, song.meta.tempo );
            }
            Vue.set(evt, 'mp', {
                module: firstEvent.mp.module,
                value: 0,
                glide: true
            });
            return evt;
        };

        for ( let i = patternIndex; i < song.patterns.length; ++i ) {
            const pattern = song.patterns[ i ];
            const channel = pattern.channels[ channelIndex ];

            for ( let j = 0; j < channel.length; ++j ) {
                let event = channel[ j ];

                if ( event === firstEvent ) {
                    eventFound = true;
                }
                else if ( event === secondEvent ) {
                    break;
                }
                else if ( eventFound ) {
                    event = addOrUpdateEvent( event, pattern, i, channel, j );
                    events.push( event );
                    prevEvent = event;
                }
            }
        }
        const steps = events.length + 1;
        let increment;

        if ( secondParam.value > firstParam.value ) {
            // gliding value up
            increment = ( secondParam.value - firstParam.value ) / steps;
            events.forEach(( event, index ) => {
                const mp = event.mp;
                Vue.set(mp, 'value', firstParam.value + (( index + 1 ) * increment));
            });
        }
        else {
            // gliding value down
            increment = ( secondParam.value - firstParam.value ) / steps;
            events.forEach(( event, index ) => {
                const mp = event.mp;
                Vue.set(mp, 'value', firstParam.value + (( index + 1 ) * increment));
            });
        }
        return events;
    },
    /**
     * glide the values between the event previous from the given step to the next event after
     * the given step (this creates a smooth gradual glide lasting for the amount of steps in
     * between the start- and endpoints described above)
     *
     * TODO: can we refactor this to not require us to pass the store?? (to-Vue-migration leftover)
     *
     * @param {SONG} song
     * @param {number} step
     * @param {number} patternIndex
     * @param {number} channelIndex
     * @param {Array<LinkedList>} lists
     * @param {Object} store the root Vuex store
     * @return {Array<AUDIO_EVENT>|null} created audio events
     */
    glideParameterAutomations(song, step, patternIndex, channelIndex, lists, store) {
        const channelEvents = song.patterns[ patternIndex ].channels[ channelIndex ];
        const event         = EventUtil.getFirstEventBeforeStep(
                                channelEvents, step, compareEvent => !!compareEvent.mp
                              );
        let createdEvents = null;
        const addFn = () => {
            const eventIndex = channelEvents.indexOf(event);
            createdEvents = EventUtil.glideModuleParams(
                song, patternIndex, channelIndex, eventIndex, lists
            );
        };
        if ( event ) {
            addFn();
        }
        if ( createdEvents ) {
            store.commit('saveState', {
                undo: () => {
                    createdEvents.forEach(( event ) => {
                        if (event.note === '')
                            EventUtil.clearEventByReference(song, event, lists);
                        else
                            Vue.set(event, 'mp', null);
                    });
                },
                redo: addFn
            });
        } else
            store.commit('showError', store.getters.t('error.paramGlide'));
    },
};
export default EventUtil;

/* internal methods */

function updatePreviousEventLength( eventListNode, songTempo ) {
    if ( !eventListNode.previous ) {
        return;
    }
    updateLengthDelta( eventListNode.previous.data, eventListNode.data, songTempo );
}

/**
 * Updates the length of given firstEvent to match the delta
 * distance between its starting offset and that of given lastEvent
 */
function updateLengthDelta( firstEvent, lastEvent, songTempo ) {
    const prevEventSeq = firstEvent.seq;
    const eventSeq     = lastEvent.seq;

    if ( prevEventSeq.startMeasure === eventSeq.startMeasure ) {
        Vue.set(prevEventSeq, 'length',
            eventSeq.startMeasureOffset - prevEventSeq.startMeasureOffset
        );
    }
    else {

        const currentStartMeasure = eventSeq.startMeasure;
        const measureLength       = calculateMeasureLength( songTempo );
        let previousStartMeasure  = prevEventSeq.startMeasure;
        let length = measureLength - prevEventSeq.startMeasureOffset;
        let i = 0;

        while ( previousStartMeasure < currentStartMeasure ) {

            if ( i > 0 )
                length += measureLength;

            ++previousStartMeasure;
            ++i;
        }
        Vue.set(prevEventSeq, 'length', length + eventSeq.startMeasureOffset);
    }
}

function calculateMeasureLength( tempo ) {
    return ( 60 / tempo ) * 4; // TODO: the 4 is implying all songs will be in 4/4 time
}
