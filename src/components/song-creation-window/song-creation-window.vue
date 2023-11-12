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
import messages from "./messages.json";

export default {
    i18n: { messages },
    created(): void {
        this.setPlaying( false );
    },
    methods: {
        ...mapMutations([
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
                this.openSong( song );
                this.close();
            });
        },
    },
}
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/typography";

.song-creation-window {
    @include editorComponent();
    @include overlay();
    @include noSelect();

    .header {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    &__content {
        display: flex;
        justify-content: space-between;
        align-items: center;

        @include large() {
            position: absolute;
            max-width: 600px;
            gap: $spacing-large;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        @include mobile() {
            flex-direction: column;
            overflow-y: auto;
            height: 85vh;
            padding: $spacing-medium 0;
        }
    }

    &__song-type {
        cursor: pointer;
        text-align: center;
        border: 2px solid transparent;
        border-radius: $spacing-medium;
        padding: $spacing-medium;
        box-sizing: border-box;
        width: 290px;

        &__preview {
            border-radius: $spacing-medium;
            border: 4px solid #666;
            height: 200px;
        }

        &__title {
            @include toolFont();
            color: $color-1;
        }

        &__descr {
            line-height: 1.75;
        }

        &:hover {
            border-color: $color-3;
        }
    }
}
</style>
