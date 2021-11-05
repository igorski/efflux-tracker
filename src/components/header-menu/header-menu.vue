/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
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
    <nav class="menu"
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
                    <a v-t="'file'" class="title" @click.prevent=""></a>
                    <ul class="file-menu">
                        <li>
                            <button
                                v-t="'newSong'"
                                type="button"
                                class="menu-button"
                                @click="handleReset()"
                            ></button>
                        </li>
                        <!-- note the use of data-attributes to expose these links for external -->
                        <!-- applications to hook into their behaviour -->
                        <li>
                            <button
                                v-t="'loadSong'"
                                type="button"
                                class="menu-button"
                                @click="handleLoad()"
                                data-api-song-load
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'saveSong'"
                                type="button"
                                class="menu-button"
                                @click="handleSave( true )"
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'saveSongAs'"
                                type="button"
                                class="menu-button"
                                @click="handleSave( false )"
                                data-api-song-save
                            ></button>
                        </li>
                        <template v-if="hasImportExport">
                            <li>
                                <button
                                    v-t="'importSong'"
                                    type="button"
                                    class="menu-button"
                                    @click="handleSongImport()"
                                ></button>
                            </li>
                            <li>
                                <button
                                    v-t="'exportSong'"
                                    type="button"
                                    class="menu-button"
                                    @click="handleSongExport()"
                                ></button>
                            </li>
                        </template>
                    </ul>
                </li>
                <li>
                    <a v-t="'instruments'" class="title" @click.prevent=""></a>
                    <ul class="file-menu">
                        <li>
                            <button
                                v-t="'instrumentEditor'"
                                type="button"
                                class="menu-button"
                                @click="handleInstrumentEditorClick()"
                            ></button>
                        </li>
                        <li>
                            <button
                                v-t="'sampleEditor'"
                                type="button"
                                class="menu-button"
                                @click="handleSampleEditorClick()"
                            ></button>
                        </li>
                        <template v-if="hasImportExport">
                            <li>
                                <button
                                    v-t="'importInstruments'"
                                    type="button"
                                    class="menu-button"
                                    @click="handleInstrumentImport()"
                                ></button>
                            </li>
                            <li>
                                <button
                                    v-t="'exportInstruments'"
                                    type="button"
                                    class="menu-button"
                                    @click="handleInstrumentExport()"
                                ></button>
                            </li>
                        </template>
                    </ul>
                </li>
                <li>
                    <button
                        v-t="'settings'"
                        type="button"
                        class="menu-button"
                        @click="handleSettings()"
                        data-api-settings
                    ></button>
                </li>
                <li>
                    <button
                        type="button"
                        class="menu-button"
                        @click="handleRecord()"
                        data-api-record
                    >{{ recordingButtonText }}</button>
                </li>
                <li>
                    <button
                        v-t="'helpTutorials'"
                        type="button"
                        class="menu-button"
                        @click="handleHelp()"
                        data-api-help
                    ></button>
                </li>
                <!-- fullscreen button -->
                <li v-if="hasFullscreen" class="fullscreen-button">
                    <button
                        v-t="'maximize'"
                        ref="fullscreenBtn"
                        type="button"
                        class="menu-button"
                        data-api-fullscreen
                    ></button>
                </li>
            </ul>
        </section>
    </nav>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import { isSupported, setToggleButton } from "@/utils/fullscreen-util";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import ManualURLs from "@/definitions/manual-urls";
import ModalWindows from "@/definitions/modal-windows";
import AudioService from "@/services/audio-service";
import { openFileBrowser } from "@/utils/file-util";
import { hasContent } from "@/utils/song-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapState([
            "menuOpened",
            "blindActive"
        ]),
        ...mapGetters([
            "activeSong",
            "getInstruments",
            "isPlaying",
        ]),
        hasImportExport() {
            return typeof window.btoa !== "undefined" && typeof window.FileReader !== "undefined";
        },
        hasFullscreen() {
            return isSupported();
        },
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
    mounted() {
        if ( this.$refs.fullscreenBtn ) {
            setToggleButton( this.$refs.fullscreenBtn, this.$t( "maximize" ), this.$t( "minimize" ));
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
            "setActiveSong",
            "setPlaying"
        ]),
        ...mapActions([
            "createSong",
            "validateSong",
            "saveSong",
            "importSong",
            "exportSong",
            "importInstruments",
            "exportInstruments"
        ]),
        handleMouseOver() {
            this.setHelpTopic("menu");
        },
        handleLoad() {
            this.openModal(ModalWindows.SONG_BROWSER);
        },
        async handleSave( allowInstantSaveWhenSongIsValid = false ) {
            if ( hasContent( this.activeSong )) {
                const { meta } = this.activeSong;
                if ( allowInstantSaveWhenSongIsValid && meta.title && meta.author ) {
                    await this.saveSong( this.activeSong );
                } else {
                    this.openModal(ModalWindows.SONG_SAVE_WINDOW);
                }
            } else {
                this.showError(this.$t("emptySong"));
            }
        },
        handleReset() {
            const self = this;
            this.openDialog({
                type: "confirm",
                message: this.$t("warningSongReset"),
                confirm() {
                    self.createSong()
                        .then(song => self.setActiveSong(song));
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
            const self = this;
            this.openDialog({
                type: "confirm",
                title: this.$t( "recordOutputTitle" ),
                message: this.$t( "recordOutputExpl" ),
                confirm() {
                    AudioService.toggleRecordingState();
                    if ( !self.isPlaying ) {
                        self.setPlaying( true );
                    }
                },
            });
        },
        handleSongImport() {
            openFileBrowser( async fileBrowserEvent => {
                const file = fileBrowserEvent.target.files?.[ 0 ];
                if ( !file ) {
                    return;
                }
                this.importSong( file ).then(() => this.showNotification({ message: this.$t("songImported") }));
            }, [ PROJECT_FILE_EXTENSION ] );
        },
        handleSongExport() {
            this.validateSong(this.activeSong).then(() => {
                this.exportSong(this.activeSong)
                    .then(() => this.showNotification({ message: this.$t("songExported", { song: this.activeSong.meta.title }) }))
                    .catch(error => this.showError( error ));
            }).catch(() => {
                // nowt. error has been shown through store validator action.
            });
        },
        handleInstrumentEditorClick() {
            this.openModal( ModalWindows.INSTRUMENT_EDITOR );
        },
        handleSampleEditorClick() {
            this.openModal( ModalWindows.SAMPLE_EDITOR );
        },
        handleInstrumentImport() {
            this.importInstruments()
                .then(amountImported => this.showNotification({ message: this.$t("instrumentsImported", { amount: amountImported.toString() }) }))
                .catch(error => this.showError(error));
        },
        handleInstrumentExport() {
            this.exportInstruments()
                .then(() => this.showNotification({ message: this.$t("instrumentsExported") }))
                .catch();
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

.menu-button {
    font-family: Montserrat, Helvetica, Verdana;
    cursor: pointer;
    background: none;
    border: none;
    color: #b6b6b6;
    padding: 0;

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
            margin: $spacing-xxsmall $spacing-medium 0 0;
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
    .file-menu li {
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

                .file-menu li {
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

            .title {
                display: none;
            }
        }
    }
}
</style>
