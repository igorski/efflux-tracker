/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2022 - https://www.igorski.nl
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
    <div class="welcome">
        <div class="header">
            <h2 v-t="'title'"></h2>
            <button
                type="button"
                class="close-button"
                @click="handleCloseClick()"
            >x</button>
        </div>
        <hr class="divider" />
        <div class="content">
            <div class="logo">
                <img src="@/assets/images/logo.png" />
            </div>
            <div>
                <h3 class="song-title">{{ activeSong.meta.title }}</h3>
                <p class="text">{{ $t('songByAuthor', { author: activeSong.meta.author }) }}</p>
                <button
                    type="button"
                    :title="'playSong'"
                    class="button play-button icon-play"
                    @click="handlePlayClick()"
                ></button>
            </div>
        </div>
        <hr class="divider" />
        <div class="footer"></div>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations, mapActions } from "vuex";
import { applyModules } from "@/services/audio-service";
import messages from "./messages.json";

export default {
    emits: [ "close" ],
    i18n: { messages },
    computed: {
        ...mapGetters([
            "activeSong",
        ]),
    },
    data: () => ({
        inited: false,
    }),
    mounted(): void {
        this.keydownHandler = async ( e ) => {
            if ( !this.inited ) {
                await this.setupSong();
            }
            if ( e.keyCode === 32 ) {
                this.close(); // KeyboardService has started song playback
            }
        };
        window.addEventListener( "keydown", this.keydownHandler );
    },
    beforeUnmount(): void {
        window.removeEventListener( "keydown", this.keydownHandler );
    },
    methods: {
        ...mapMutations([
            "setPlaying",
        ]),
        ...mapActions([
            "cacheSongSamples",
        ]),
        async handlePlayClick(): Promise<void> {
            await this.setupSong();
            this.setPlaying( true );
            this.close();
        },
        async handleCloseClick(): Promise<void> {
            await this.setupSong();
            this.close();
        },
        setupSong(): Promise<void> {
            // The song may have preloaded, but the AudioContext is silenced until a
            // user interaction occurs. Call this method after one such interaction
            // so we can cache the song samples (requires active AudioContext) and
            // apply the modules.
            return new Promise( resolve => {
                if ( this.inited ) {
                    return resolve();
                }
                setTimeout( async () => {
                    await this.cacheSongSamples( this.activeSong.samples );
                    applyModules( this.activeSong );
                    this.inited = true;
                    resolve();
                }, 100 );
            });
        },
        close(): void {
            this.$emit( "close" );
        },
    }
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/transporter";
@use "@/styles/typography";

$width: 450px;
$height: 475px;

.welcome {
    @include mixins.editorComponent();
    @include mixins.overlay();
    padding: variables.$spacing-small variables.$spacing-large;

    .divider {
        width: calc(100% + #{variables.$spacing-large * 2});
        margin-left: -( variables.$spacing-large );
        margin-bottom: variables.$spacing-medium;
    }

    @include mixins.componentIdeal( $width, $height ) {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        margin-left: math.div( -$width, 2 );
        margin-top: math.div( -$height, 2 );
    }

    @include mixins.componentFallback( $width, $height ) {
        @include mixins.verticalScrollOnMobile();
    }
}

.content {
    text-align: center;
}

.logo {
    display: inline-block;
    width: 40%;

    img {
        width: 100%;
    }
}

.song-title {
    @include typography.toolFont();
}

.text {
    text-align: left;
}

.play-button {
    display: block;
    width: 100%;
}

.footer {
    text-align: right;
}
</style>
