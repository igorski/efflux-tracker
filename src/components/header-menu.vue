/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
        <h1>efflux</h1>
        <section class="inline">
            <ul class="menu-list">
                <li>
                    <a class="title" @click.prevent="">File</a>
                    <ul class="file-menu">
                        <li @click="handleLoad" data-api-song-load>Load song</li>
                        <li @click="handleSave">Save song</li>
                        <!-- note we expose these id's so external apps can hook into their behaviour -->
                        <template v-if="hasImportExport">
                            <li @click="handleSongImport">Import song</li>
                            <li @click="handleSongExport">Export song</li>
                        </template>
                        <li id="songReset" @click="handleReset" data-api-song-reset>Reset song</li>
                        <template v-if="hasImportExport">
                            <li @click="handleInstrumentImport">Import instrument presets</li>
                            <li @click="handleInstrumentExport">Export instrument presets</li>
                        </template>
                    </ul>
                </li>
                <li @click="handleSettings" data-api-settings>Settings</li>
                <li v-if="hasRecord"
                    @click="handleRecord" data-api-record>Record output</li>
                <li @click="handleHelp" data-api-help>Help</li>
                <!-- fullscreen button -->
                <li v-if="hasFullscreen"
                    ref="fullscreenBtn"
                    class="fullscreen-button"
                    data-api-fullscreen
                >Maximize</li>
            </ul>
        </section>
    </nav>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';
import { isSupported, setToggleButton } from '../utils/fullscreen-util';
import AudioService from '../services/audio-service';
import ManualURLs from '../definitions/manual-urls';
import ModalWindows from '../definitions/modal-windows';

export default {
    computed: {
        ...mapState([
            'menuOpened',
            'blindActive'
        ]),
        ...mapGetters([
            'activeSong',
            'getInstruments',
            'getCopy'
        ]),
        hasImportExport() {
            return typeof window.btoa !== 'undefined' && typeof window.FileReader !== 'undefined';
        },
        hasFullscreen() {
            return isSupported();
        },
        hasRecord() {
            // on iOS and Safari recording isn't working as expected...
            const userAgent = window.navigator.userAgent;
            return !userAgent.match(/(iPad|iPhone|iPod)/g) && userAgent.match(/(Chrome)/g);
        }
    },
    watch: {
        blindActive(isOpen, wasOpen) {
            if (!isOpen && wasOpen === true) {
                this.setMenuOpened(false);
            }
        }
    },
    mounted() {
        if (this.$refs.fullscreenBtn) {
            setToggleButton(this.$refs.fullscreenBtn);
        }
    },
    methods: {
        ...mapMutations([
            'setMenuOpened',
            'setHelpTopic',
            'openModal',
            'openDialog',
            'showError',
            'showNotification',
            'setActiveSong'
        ]),
        ...mapActions([
            'createSong',
            'validateSong',
            'saveSong',
            'importSong',
            'exportSong',
            'importInstruments',
            'exportInstruments'
        ]),
        handleMouseOver() {
            this.setHelpTopic('menu');
        },
        handleLoad() {
            this.openModal(ModalWindows.SONG_BROWSER);
        },
        handleSave() {
            this.saveSong(this.activeSong);
        },
        handleReset() {
            const self = this;
            this.openDialog({
                type: 'confirm',
                message: this.getCopy('WARNING_SONG_RESET'),
                confirm() {
                    self.createSong()
                        .then(song => self.setActiveSong(song));
                },
            });
        },
        handleSettings() {
            this.openModal(ModalWindows.SETTINGS_WINDOW);
        },
        handleHelp() {
            window.open(ManualURLs.ONLINE_MANUAL);
        },
        handleRecord() {
            AudioService.toggleRecordingState();
            this.showNotification({ message: this.getCopy('RECORDING_ENABLED') });
        },
        handleSongImport() {
            this.importSong()
                .then(() => this.showNotification({ message: this.getCopy('SONG_IMPORTED') }))
                .catch(error => this.showError(error));
        },
        handleSongExport() {
            this.validateSong(this.activeSong).then(() => {
                this.exportSong(this.activeSong)
                    .then(() => this.showNotification({ message: this.getCopy('SONG_EXPORTED', this.activeSong.meta.title) }))
                    .catch(error => this.showError(error));
            }).catch(() => {
                // nowt. error has been shown through store validator action.
            });
        },
        handleInstrumentImport() {
            this.importInstruments()
                .then(amountImported => this.showNotification({ message: this.getCopy('INSTRUMENTS_IMPORTED', amountImported.toString()) }))
                .catch(error => this.showError(error));
        },
        handleInstrumentExport() {
            this.exportInstruments()
                .then(() => this.showNotification({ message: this.getCopy('INSTRUMENTS_EXPORTED') }))
                .catch();
        },
    }
};
</script>

<style lang="scss" scoped>
    @import "../styles/_variables.scss";

    .menu {
      color: #b6b6b6;
      display: block;
      margin: 0 auto;
      padding: 0 $spacing-medium $spacing-small;
      width: 100%;
      @include boxSize;
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
        font-family: Montserrat, Helvetica, Verdana;
        cursor: pointer;

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
          margin-right: 1$spacing-medium;
        }
      }
    }

    /* tablet / desktop (everything larger than a phone) */

    @media screen and ( min-width: $mobile-width ) {
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
            color: #b6b6b6;
            padding: $spacing-xsmall $spacing-medium;

            &:hover {
                color: #FFF;
            }
        }
    }

    /* ideal view */

    @media screen and ( min-width: $ideal-width ) {
        .menu {
            min-width: auto;
        }
    }

    /* mobile view */

    @media screen and ( max-width: $mobile-width ) {
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
