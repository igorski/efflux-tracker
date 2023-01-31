/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019-2023 - https://www.igorski.nl
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
import type { Store } from "vuex";
import type { XTK } from "@/model/serializers/song-serializer";
import Messages from "./pubsub/messages";

type PubSubBroadcastHandler = ( message: string, payload?: any ) => void;

type PubSubJS = {
    subscribe: ( message: string, handler: PubSubBroadcastHandler ) => string;
    unsubscribe: ( token: string ) => void;
    publish: ( message: string, payload?: any ) => void;
};

let store: Store<any>;
let pubsub: PubSubJS | undefined;

/**
 * Here we expose parts of Efflux as an API to
 * integrate with third party applications
 */
export default
{
    init( storeReference: Store<any>, pubsubReference: PubSubJS ): void {
        if ( !pubsubReference ) {
            return;
        }
        store  = storeReference;
        pubsub = pubsubReference;

        // subscribe to messages

        [
            Messages.LOAD_SONG,
            Messages.VALIDATE_AND_GET_SONG,
            Messages.SHOW_ERROR,
            Messages.SET_LOADING_STATE,
            Messages.UNSET_LOADING_STATE,
            Messages.SET_BLIND_STATE,
            Messages.CLOSE_OVERLAY

        ].forEach( m => pubsub.subscribe( m, handleBroadcast ));
    },
    publish( message: string, payload?: any ): void {
        if ( !pubsub ) {
            return;
        }
        pubsub.publish( message, payload );
    },
    subscribe( message: string, handler: PubSubBroadcastHandler ): string {
        if ( !pubsub ) {
            return;
        }
        return pubsub.subscribe( message, handler );
    },
    unsubscribe( token: string ): boolean {
        if ( !pubsub ) {
            return false;
        }
        pubsub.unsubscribe( token );
        return true;
    },
};

/* internal methods */

function handleBroadcast( message: string, payload?: any ): void {
    switch ( message ) {
        default:
            return;
        case Messages.LOAD_SONG:
            store.commit( "closeDialog" );
            store.dispatch( "openSharedSong", payload );
            break;
        case Messages.VALIDATE_AND_GET_SONG:
            // payload is fn awaiting song object
            if ( typeof payload !== "function" ) {
                return;
            }
            store.dispatch( "exportSongForShare", store.state.song.activeSong )
                .then(( xtk: XTK ) => {
                    payload( xtk, store.state.song.activeSong.meta );
                }).catch(() => {
                    // ...nowt, validation messages will have been triggered by store validate
                });
            break;
        case Messages.SHOW_ERROR:
            store.commit( "showError", payload );
            break;
        case Messages.SET_LOADING_STATE:
            store.commit( "setLoading", payload );
            break;
        case Messages.UNSET_LOADING_STATE:
            store.commit( "unsetLoading", payload );
            break;
        case Messages.SET_BLIND_STATE:
            store.commit( "setBlindActive", !!payload );
            break;
        case Messages.CLOSE_OVERLAY:
            store.commit( "closeModal" );
            break;
    }
}
