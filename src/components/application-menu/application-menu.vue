/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
    <nav
        class="menu"
        :class="{ opened: menuOpened }"
        @mouseover="handleMouseOver"
    >
        <div class="toggle" @click="setMenuOpened(!menuOpened)">
            <span>&#9776;</span>
        </div>
        <h1 v-t="'title'"></h1>
        <section class="inline">
            <ul class="menu-list">
                <li>
                    <a v-t="'file'" class="menu-list__title" @click.prevent=""></a>
                    <ul class="menu-list__submenu">
                        <li>
                            <button
                                v-t="'new'"
                                type="button"
                                class="menu-list__button"
                                @click="handleReset()"
                            ></button>
                        </li>
                        <!-- note the use of data-attributes to expose these links for external -->
                        <!-- applications to hook into their behaviour -->
                        <li>
                            <button
                                v-t="'open'"
                                type="button"
                                class="menu-list__button"
                                @click="handleLoad()"
                                data-api-song-load
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'save'"
                                type="button"
                                class="menu-list__button"
                                @click="handleSave( true )"
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'saveAs'"
                                type="button"
                                class="menu-list__button"
                                @click="handleSave( false )"
                                data-api-song-save
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'exportProject'"
                                type="button"
                                class="menu-list__button"
                                @click="handleExport()"
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'exportJSON'"
                                type="button"
                                class="menu-list__button"
                                @click="handleJSONExport()"
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'exportMidi'"
                                type="button"
                                class="menu-list__button"
                                @click="handleMidiExport()"
                            ></button>
                        </li>
                    </ul>
                </li>
                <li>
                    <a v-t="'edit'" class="menu-list__title" @click.prevent=""></a>
                    <ul class="menu-list__submenu">
                        <li>
                            <button
                                v-t="'transposePitch'"
                                type="button"
                                class="menu-list__button"
                                @click="handleTransposeClick()"
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'insertChord'"
                                type="button"
                                class="menu-list__button"
                                @click="handleChordClick()"
                            ></button>
                        </li>
                        <li>
                            <hr class="divider" />
                        </li>
                        <li>
                            <button
                                v-t="'optimizeResources'"
                                type="button"
                                class="menu-list__button"
                                @click="handleOptimizeClick()"
                            ></button>
                        </li>
                    </ul>
                </li>
                <li>
                    <a v-t="'instruments'" class="menu-list__title" @click.prevent=""></a>
                    <ul class="menu-list__submenu">
                        <li>
                            <button
                                v-t="'manageInstruments'"
                                type="button"
                                class="menu-list__button"
                                @click="handleInstrumentBrowserClick()"
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'instrumentEditor'"
                                type="button"
                                class="menu-list__button"
                                @click="handleInstrumentEditorClick()"
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'sampleEditor'"
                                type="button"
                                class="menu-list__button"
                                @click="handleSampleEditorClick()"
                            ></button>
                        </li>
                    </ul>
                </li>
                <li>
                    <button
                        v-t="'settings'"
                        type="button"
                        class="menu-list__button"
                        @click="handleSettings()"
                        data-api-settings
                    ></button>
                </li>
                <li>
                    <button
                        type="button"
                        class="menu-list__button"
                        @click="handleRecord()"
                        data-api-record
                    >{{ recordingButtonText }}</button>
                </li>
                <li>
                    <button
                        v-t="'helpTutorials'"
                        type="button"
                        class="menu-list__button"
                        @click="handleHelp()"
                        data-api-help
                    ></button>
                </li>
                <!-- fullscreen button -->
                <li v-if="hasFullscreen" class="fullscreen-button">
                    <button
                        ref="fullscreenBtn"
                        type="button"
                        class="menu-list__button"
                        :title="$t( isFullscreen ? 'minimize' : 'maximize' )"
                        data-api-fullscreen
                    >
                        <img
                            v-if="isFullscreen"
                            src="@/assets/icons/icon-minimize.svg"
                            :alt="$t( 'minimize' )"
                        />
                        <img
                            v-else
                            src="@/assets/icons/icon-maximize.svg"
                            :alt="$t( 'maximize' )"
                        />
                    </button>
                </li>
            </ul>
        </section>
    </nav>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import ManualURLs from "@/definitions/manual-urls";
import ModalWindows from "@/definitions/modal-windows";
import AudioService from "@/services/audio-service";
import { isSupported, setToggleButton } from "@/utils/fullscreen-util";
import { saveAsFile } from "@/utils/file-util";
import { hasContent } from "@/utils/song-util";
import { toFileName } from "@/utils/string-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    data: () => ({
        isFullscreen: false,
    }),
    computed: {
        ...mapState([
            "menuOpened",
            "blindActive"
        ]),
        ...mapGetters([
            "activeSong",
            "getInstruments",
            "isPlaying",
            "totalSaved",
        ]),
        recordingButtonText() {
            return this.isPlaying && AudioService.isRecording() ? this.$t( "stopRecording" ) : this.$t( "recordOutput" );
        },
    },
    watch: {
        blindActive(isOpen, wasOpen) {
            if ( !isOpen && wasOpen === true ) {
                this.setMenuOpened( false );
            }
        }
    },
    created() {
        this.hasFullscreen = isSupported();
    },
    mounted() {
        if ( this.$refs.fullscreenBtn ) {
            setToggleButton( this.$refs.fullscreenBtn, isFullscreen => {
                this.isFullscreen = isFullscreen;
            });
        }
    },
    methods: {
        ...mapMutations([
            "setMenuOpened",
            "setHelpTopic",
            "openModal",
            "openDialog",
            "showError",
            "showNotification",
            "setLoading",
            "setPlaying",
            "setStatesOnSave",
            "unsetLoading",
        ]),
        ...mapActions([
            "createSong",
            "exportSong",
            "exportSongForShare",
            "saveSong",
            "openSong",
        ]),
        handleMouseOver() {
            this.setHelpTopic("menu");
        },
        handleLoad() {
            this.openModal( ModalWindows.SONG_BROWSER );
        },
        async handleSave( allowInstantSaveWhenSongIsValid = false ) {
            if ( hasContent( this.activeSong )) {
                const { meta } = this.activeSong;
                if ( allowInstantSaveWhenSongIsValid && meta.title && meta.author ) {
                    await this.saveSong( this.activeSong );
                } else {
                    this.openModal( ModalWindows.SONG_SAVE_WINDOW );
                }
            } else {
                this.showError( this.$t( "emptySong" ));
            }
        },
        async handleExport() {
            try {
                await this.exportSong( this.activeSong );
                // we do not make setStatesOnSave part of the Vuex action as it can also be called
                // from the song browser for currently unloaded songs
                this.setStatesOnSave( this.totalSaved );
                this.showNotification({ message: this.$t( "songExported", { song: this.activeSong.meta.title }) });
            } catch {
                this.showError( this.$t( "errorSongExport" ));
            }
        },
        async handleJSONExport() {
            try {
                const { title } = this.activeSong.meta;
                const data = await this.exportSongForShare( this.activeSong );
                saveAsFile( new Blob([ data ], { type: "text/plain" }), toFileName( title, ".json" ));
                this.showNotification({ message: this.$t( "songExported", { song: title }) });
            } catch {
                this.showError( this.$t( "errorSongExport" ));
            }
        },
        handleMidiExport() {
            this.openModal( ModalWindows.MIDI_EXPORT_WINDOW );
        },
        handleTransposeClick() {
            this.openModal( ModalWindows.TRANSPOSITION_EDITOR );
        },
        handleChordClick() {
            this.openModal( ModalWindows.CHORD_GENERATOR_WINDOW );
        },
        handleOptimizeClick() {
            this.openModal( ModalWindows.OPTIMIZATION_WINDOW );
        },
        handleReset() {
            this.openDialog({
                type: "confirm",
                message: this.$t("warningSongReset"),
                confirm: () => {
                    this.createSong().then( song => this.openSong( song ));
                },
            });
        },
        handleSettings() {
            this.openModal( ModalWindows.SETTINGS_WINDOW );
        },
        handleHelp() {
            window.open( ManualURLs.ONLINE_MANUAL );
        },
        handleRecord() {
            if ( AudioService.isRecording() ) {
                return AudioService.toggleRecordingState();
            }
            this.openDialog({
                type: "confirm",
                title: this.$t( "recordOutputTitle" ),
                message: this.$t( "recordOutputExpl" ),
                confirm: () => {
                    AudioService.toggleRecordingState();
                    if ( !this.isPlaying ) {
                        this.setPlaying( true );
                    }
                },
            });
        },
        handleInstrumentEditorClick() {
            this.openModal( ModalWindows.INSTRUMENT_EDITOR );
        },
        handleSampleEditorClick() {
            this.openModal( ModalWindows.SAMPLE_EDITOR );
        },
        handleInstrumentBrowserClick() {
            this.openModal( ModalWindows.INSTRUMENT_MANAGER );
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

.menu {
    color: #b6b6b6;
    display: block;
    margin: 0 auto;
    padding: 0 $spacing-medium $spacing-small;
    width: 100%;
    @include boxSize();
}

.menu-list__button,
.menu-list__title {
    @include titleFont();
    cursor: pointer;
    background: none;
    border: none;
    color: #b6b6b6;
    padding: 0;
    font-size: 100%;

    &:hover {
        color: #FFF;

        @include mobile() {
            color: #000;
        }
    }
}

.toggle {
    position: absolute;
    display: none;
    cursor: pointer;
    top: 0;
    left: 0;
    width: $toggle-width;
    height: $menu-height;

    span {
        position: absolute;
        top: 50%;
        left: 50%;
        margin-top: -$spacing-medium;
        margin-left: -$spacing-medium;
    }
}

h1 {
    color: #FFF;
    display: inline;
    margin: 0;
    padding: 0;
    padding-right: $spacing-medium;
    font-size: 110%;
}

.menu-list {
    display: inline;
    list-style-type: none;
    padding: 0;
    margin: 0;
    @include boxSize;

    li {
        display: inline-block;
        padding: 0 $spacing-medium 0 0;
        margin: 0;

        a {
            color: #b6b6b6;
            text-decoration: none;
            padding-bottom: $spacing-large;
        }

        &:hover,
        &:hover a {
            color: $color-1;
            border-bottom: none;
            text-decoration: none;
        }

        &.active {
            a {
                border-bottom: 3px solid #555;
            }
        }

        ul {
            list-style: none;
        }

        &.fullscreen-button {
            float: right;
            margin: 2px $spacing-medium 0 0;

            img:hover {
                filter: brightness(0) invert(1);
            }
        }

        .divider {
            @include divider();
        }
    }
}

/* tablet / desktop (everything larger than a phone) */

@include large() {
    .menu {
        min-width: 100%;
        max-width: $ideal-width;
        margin: 0 auto;
        padding-left: $spacing-large;
    }

    .menu-list li {
        &:hover, &:focus {
            a {
                color: $color-1;
            }
            ul {
                display: block;
                z-index: 2;
            }
        }
        ul {
            display: none;
            position: absolute;
            box-shadow: 0 0 5px rgba(0,0,0,.5);
            padding: $spacing-medium;
            background-image: linear-gradient(to bottom,#282828 35%,#383838 90%);
            background-repeat: repeat-x;
            @include boxSize;
        }
    }
    .menu-list__submenu li {
        display: block;
        padding: $spacing-xsmall $spacing-medium;
    }
}

/* ideal view */

@include ideal() {
    .menu {
        min-width: auto;
    }
}

/* mobile view */

@include mobile() {
    .menu {
        position: fixed;
        z-index: 2; // above transport controls
        overflow: hidden;
        width: 100%;
        height: inherit;
        top: 0;
        left: 0;

        &.opened {
            position: absolute;
            overflow-y: auto;
            .menu-list {
                left: 0;
                display: block;
                height: 100%;
            }
        }

        .toggle {
            display: block;
        }

        h1 {
            display: none;
        }

        ul {
            display: block;
            width: 100%;

            padding: 0;

            li {
                display: block;
                width: 100%;

                a {
                    width: 100%;
                }
            }
        }

        ul {
            h1 {
                display: none;
            }

            li {
                padding: $spacing-small $spacing-large;

                .menu-list__submenu li {
                    padding: $spacing-small 0;
                }

                a {
                    display: block;
                    width: 100%;
                    padding: $spacing-medium $spacing-large;
                    color: #000;

                    &:hover {
                        color: #000;
                    }
                }

                &.active a {
                    border-bottom: none;
                    color: #FFF;
                    font-weight: bold;
                    font-style: italic;
                    background-color: $color-1;
                }

                &.fullscreen-button {
                    float: left;
                }
            }
        }

        .menu-list {
            position: absolute;
            top: $menu-height;
            background-image: linear-gradient(to bottom,#fff 35%,#eee 90%);
            background-repeat: repeat-x;
            display: none;

            &__title {
                display: none;
            }
        }
    }
}
</style>
