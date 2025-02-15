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
<template>
    <div class="song-creation-window">
        <div class="header">
            <h2 v-t="'createNew'"></h2>
        </div>
        <hr class="divider" />
        <div class="song-creation-window__content">
            <div
                class="song-creation-window__song-type"
                role="button"
                @click="createTrackerSong()"
            >
                <img
                    class="song-creation-window__song-type__preview"
                    src="@/assets/images/snippet_tracker.png"
                />
                <h3 v-t="'tracker'" class="song-creation-window__song-type__title"></h3>
                <p v-t="'trackerExpl'" class="song-creation-window__song-type__descr"></p>
            </div>
            <div
                class="song-creation-window__song-type"
                role="button"
                @click="createJamSession()"
            >
            <img
                    class="song-creation-window__song-type__preview"
                    src="@/assets/images/snippet_jam_mode.png"
                />
                <h3 v-t="'jamSession'" class="song-creation-window__song-type__title"></h3>
                <p v-t="'jamSessionExpl'" class="song-creation-window__song-type__descr"></p>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { mapMutations, mapActions } from "vuex";
import { EffluxSongType } from "@/model/types/song";
import PubSubMessages from "@/services/pubsub/messages";
import messages from "./messages.json";

export default {
    emits: [ "close" ],
    i18n: { messages },
    created(): void {
        this.setPlaying( false );
    },
    methods: {
        ...mapMutations([
            "publishMessage",
            "setPlaying",
        ]),
        ...mapActions([
            "createSong",
            "openSong",
        ]),
        createTrackerSong(): void {
            this.createAndClose( EffluxSongType.TRACKER );
        },
        createJamSession(): void {
            this.createAndClose( EffluxSongType.JAM );
        },
        close(): void {
            this.$emit( "close" );
        },
        createAndClose( type: EffluxSongType ): void {
            this.createSong( type ).then( song => {
                this.publishMessage( type === EffluxSongType.JAM ? PubSubMessages.JAM_SESSION_CREATED : PubSubMessages.TRACKER_SESSION_CREATED );
                this.openSong( song );
                this.close();
            });
        },
    },
}
</script>

<style lang="scss" scoped>
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/typography";

.song-creation-window {
    @include mixins.editorComponent();
    @include mixins.overlay();
    @include mixins.noSelect();
    background-image: linear-gradient(to bottom, colors.$color-editor-background 35%, colors.$color-form-background 90%);
  
    .header {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    &__content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: variables.$spacing-large;
 
        @include mixins.large() {
            position: absolute;
            max-width: 600px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        @include mixins.mobile() {
            flex-direction: column;
            overflow-y: auto;
            height: 85vh;
            padding: variables.$spacing-medium 0;
        }
    }

    &__song-type {
        cursor: pointer;
        text-align: center;
        width: 290px;
        border: 2px solid transparent;
        border-radius: variables.$spacing-large;
        border-bottom: 6px solid #666;
        padding: variables.$spacing-large variables.$spacing-medium variables.$spacing-xxsmall;
        box-sizing: border-box;
        background-color: colors.$color-editor-background;
    
        @include mixins.large() {
            box-shadow: 0 2px variables.$spacing-large rgba(0,0,0,.25);
        }

        &__preview {
            border-radius: variables.$spacing-medium;
            border: 4px solid #666;
            height: 200px;
        }

        &__title {
            @include typography.toolFont();
            color: colors.$color-1;
            font-size: 150%;
        }

        &__descr {
            line-height: 1.75;
            background-color: colors.$color-form-background;
            padding: variables.$spacing-medium;
            border-radius: variables.$spacing-medium
        }

        &:hover {
            border-color: colors.$color-3;
        }
    }
}
</style>
