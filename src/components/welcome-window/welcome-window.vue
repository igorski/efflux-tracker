/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2024 - https://www.igorski.nl
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
                @click="close()"
            >x</button>
        </div>
        <hr class="divider" />
        <div class="pane text">
            <p v-t="'introductionFirstTime'"></p>
            <button
                type="button"
                class="pulse-button"
                @click="openSavedSong()"
            >
                <span v-t="'openSong'"></span><span class="pulse-button__animation"></span>
            </button>
            <button
                type="button"
                v-t="'tweakInstrument'"
                @click="openInstrumentEditor()"
            ></button>
            <i18n-t keypath="introductionHelp" tag="p">
                <span class="emphasis">{{ $t('jamMode') }}</span>
            </i18n-t>
            <button
                type="button"
                class="button--secondary"
                v-t="'jamMode'"
                @click="createJamSong()"
            ></button>
            <button
                type="button"
                v-t="'openHelp'"
                @click="openHelp()"
            ></button>
        </div>
        <div class="pane logo">
            <img
                src="@/assets/images/logo.png"
                class="logo"
            />
        </div>
        <hr class="divider" />
        <div class="pane spaced-buttons">
            <p>{{ 'For the returning user:' }}</p>
            <file-loader class="file-loader" />
        </div>
        <hr class="divider" />
        <div class="wrapper input footer">
            <label v-t="'showOnStartup'"></label>
            <toggle-button
                v-model="showOnStartup"
                class="show-startup"
                sync
            />
        </div>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations, mapActions } from "vuex";
import ToggleButton from "@/components/third-party/vue-js-toggle-button/ToggleButton.vue";
import FileLoader from "@/components/file-loader/file-loader.vue";
import ManualURLs from "@/definitions/manual-urls";
import ModalWindows from "@/definitions/modal-windows";
import { EffluxSongType } from "@/model/types/song";
import PubSubMessages from "@/services/pubsub/messages";
import { PROPERTIES } from "@/store/modules/settings-module";

import messages from "./messages.json";

export default {
    emits: [ "close" ],
    i18n: { messages },
    components: {
        FileLoader,
        ToggleButton,
    },
    computed: {
        ...mapGetters([
            "displayWelcome",
        ]),
        showOnStartup: {
            get(): boolean {
                return this.displayWelcome;
            },
            set( value: boolean ): void {
                this.saveSetting(
                    { name: PROPERTIES.DISPLAY_WELCOME, value }
                );
            }
        },
    },
    methods: {
        ...mapMutations([
            "openModal",
            "publishMessage",
            "saveSetting",
        ]),
        ...mapActions([
            "createSong",
            "openSong",
        ]),
        openSavedSong(): void {
            this.openModal( ModalWindows.SONG_BROWSER );
        },
        openHelp(): void {
            window.open( ManualURLs.ONLINE_MANUAL );
        },
        openInstrumentEditor(): void {
            this.openModal( ModalWindows.JAM_MODE_INSTRUMENT_EDITOR );
           // this.openModal( ModalWindows.INSTRUMENT_EDITOR );
        },
        createJamSong(): void {
            this.createSong( EffluxSongType.JAM ).then( song => {
                this.publishMessage( PubSubMessages.JAM_SESSION_CREATED );
                this.openSong( song );
                this.close();
                this.openModal( ModalWindows.JAM_MODE_INSTRUMENT_EDITOR );
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

@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/forms";

$width: 550px;
$height: 474px;

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

        .pane p:first-of-type {
            margin-top: variables.$spacing-small;
        }
    }

    @include mixins.componentFallback( $width, $height ) {
        @include mixins.verticalScrollOnMobile();
        .pane button {
            display: block;
            width: 100%;
            margin-bottom: variables.$spacing-small;
        }
    }
}

.pane {
    display: inline-block;
    vertical-align: top;

    &.logo {
        width: 40%;
    }
    &.text {
        width: 60%;
    }

    img {
        width: 100%;
    }

    .emphasis {
        font-weight: bold;
        font-style: italic;
        text-transform: lowercase;
        color: #FFF;
    }

    .button--secondary {
        background-color: colors.$color-4;

        &:hover {
            background-color: #FFF;
        }
    }
}

.spaced-buttons {
    @include mixins.componentIdeal( $width, $height ) {
        display: flex;
        justify-content: space-between;
    }

    @include mixins.componentFallback( $width, $height ) {
        .file-loader {
            margin-top: variables.$spacing-small;
        }
    }

    p {
        margin: variables.$spacing-xsmall 0 0 !important;
    }
}

.footer {
    text-align: right;
}

.show-startup {
    margin-left: variables.$spacing-small;
}

.pulse-button {
    position: relative;

    &__animation {
        $animationSize: 24px;
        
        position: absolute;
        top: 50%;
        left: 0;
        margin-top: math.div( -$animationSize, 2 );
        border-radius: variables.$spacing-xsmall;
        box-shadow: 0 0 0 0 rgba(255, 177, 66, 1);
        height: $animationSize;
        width: 100%;
        transform: scale(1);
        animation: pulse-animation 2s infinite;
    }
}

@keyframes pulse-animation {
	0% {
		transform: scale(0.95);
		box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
	}
	
	70% {
		transform: scale(1);
		box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
	}
	
	100% {
		transform: scale(0.95);
		box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
	}
}
</style>
