/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
<template>
    <div class="inline-block">
        <button
            v-if="asMenuButton"
            type="button"
            class="menu-button"
            @click="authenticated ? openFileBrowser() : login()"
        >{{ buttonTitle }}</button>
        <template v-else>
            <template v-if="!authenticated">
                <button
                    v-if="authUrl"
                    v-t="'loginToDropbox'"
                    type="button"
                    class="button dropbox-button"
                    @click="login()"
                ></button>
            </template>
            <template v-if="authenticated || awaitingConnection">
                <button
                    v-t="authenticated ? 'importFromDropbox' : 'connectingToDropbox'"
                    type="button"
                    class="button dropbox-button"
                    :disabled="awaitingConnection"
                    @click="openFileBrowser()"
                ></button>
            </template>
        </template>
    </div>
</template>

<script lang="ts">
import { mapState, mapMutations } from "vuex";
import ModalWindows from "@/definitions/modal-windows";
import {
    isAuthenticated, requestLogin, registerAccessToken
} from "@/services/dropbox-service";
import messages from "./messages.json";

let loginWindow, boundHandler;

export default {
    i18n: { messages },
    props: {
        asMenuButton: {
            type: Boolean,
            default: false,
        },
        buttonTitle: {
            type: String,
            default: "Dropbox",
        },
    },
    data: () => ({
        authenticated: false,
        loading: false,
        authUrl: "",
    }),
    computed: {
        ...mapState([
            "dropboxConnected",
        ]),
        awaitingConnection(): boolean {
            return !this.authenticated && !this.authUrl;
        },
    },
    async created(): Promise<void> {
        this.loading = true;

        // note we wrap the authentication check inside a global loading state as Dropbox
        // API has been observed to have high latencies
        const LOADING_KEY = "dbxc";
        this.setLoading( LOADING_KEY );
        this.authenticated = await isAuthenticated();
        this.unsetLoading( LOADING_KEY );

        if ( this.authenticated ) {
            if ( !this.dropboxConnected ) {
                this.showConnectionMessage();
            }
            this.openFileBrowser();
        } else {
            this.authUrl = await requestLogin(
                window.dropboxClientId || localStorage?.getItem( "effluxDropboxClientId" ),
                window.dropboxRedirect || `${window.location.href}login.html`
            );
            this.openDialog({
                type: "confirm",
                title: this.$t( "establishConnection" ),
                message: this.$t( "connectionExpl" ),
                confirm: () => this.login(),
            });
        }
        this.loading = false;
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "openModal",
            "showNotification",
            "setLoading",
            "unsetLoading",
        ]),
        login(): void {
            loginWindow  = window.open( this.authUrl );
            boundHandler = this.messageHandler.bind( this );
            window.addEventListener( "message", boundHandler );
        },
        messageHandler({ data }): void {
            if ( data?.accessToken ) {
                registerAccessToken( data.accessToken );
                window.removeEventListener( "message", boundHandler );
                loginWindow?.close();
                loginWindow = null;
                this.showConnectionMessage();
                this.authenticated = true;
                this.openFileBrowser();
            }
        },
        openFileBrowser(): void {
            this.openModal( ModalWindows.DROPBOX_FILE_SELECTOR );
        },
        showConnectionMessage(): void {
            this.showNotification({ message: this.$t( "connectedToDropbox" ) });
        },
    },
};
</script>

<style lang="scss" scoped>
@use "@/styles/_mixins";
@use "@/styles/thirdparty";

.menu-button {
    @include mixins.menuButton();
}
</style>
