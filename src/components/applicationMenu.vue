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
    <nav id="menu"
         :class="{ opened: menuOpened }"
         @mouseover="handleMouseOver"
    >
        <div class="toggle" @click="setMenuOpened(!menuOpened)">
            <span>&#9776;</span>
        </div>
        <h1>efflux</h1>
        <section id="menuSection">
            <ul id="menuList">
                <li>
                    <a class="title" @click.prevent="">File</a>
                    <ul id="fileMenu">
                        <li @click="handleLoad">Load song</li>
                        <li @click="handleSave">Save song</li>
                        <!-- note we expose these id's so external apps can hook into their behaviour -->
                        <template v-if="hasImportExport">
                            <li @click="handleSongImport">Import song</li>
                            <li @click="handleSongExport">Export song</li>
                        </template>
                        <li id="songReset" @click="handleReset">Reset song</li>
                        <template v-if="hasImportExport">
                            <li @click="handleInstrumentImport">Import instrument presets</li>
                            <li @click="handleInstrumentExport">Export instrument presets</li>
                        </template>
                    </ul>
                </li>
                <li @click="handleSettings">Settings</li>
                <li v-if="hasRecord" @click="handleRecord">Record output</li>
                <li @click="handleHelp">Help</li>
                <!-- fullscreen button -->
                <li v-if="hasFullscreen"
                    ref="fullscreenBtn"
                    id="fullscreenBtn"
                >Maximize</li>
            </ul>
        </section>
    </nav>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';
import { isSupported, setToggleButton } from '../utils/Fullscreen';
import { getCopy } from '../i18n/Copy';
import Manual from '../definitions/Manual';
import Messages from '../definitions/Messages';
import SongUtil from '../utils/SongUtil';

export default {
    computed: {
        ...mapState([
            'menuOpened',
            'blindActive',
        ]),
        ...mapGetters([
            'activeSong',
            'getInstruments',
            'getCopy',
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
            return ( "Blob" in window && ( !userAgent.match(/(iPad|iPhone|iPod)/g ) && userAgent.match( /(Chrome)/g )) );
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
            'setOverlay',
            'openDialog',
            'showError',
            'showNotification',
            'setActiveSong',
        ]),
        ...mapActions([
            'createSong',
            'saveSong',
            'importSong',
            'exportSong',
            'importInstruments',
            'exportInstruments',
        ]),
        handleMouseOver( aEvent ) {
            this.setHelpTopic('menu');
        },
        handleLoad( aEvent ) {
            this.setOverlay('sngbr');
        },
        handleSave( aEvent ) {
            if ( this.isValid( this.activeSong )) {
                this.saveSong( this.activeSong )
                    .then(() => {
                        this.showNotification({ message: this.getCopy('SONG_SAVED', this.activeSong.meta.title) });
                    });
            }
        },
        handleReset( aEvent ) {
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
        handleSettings( aEvent ) {
            this.setOverlay('settings');
        },
        handleHelp(aEvent) {
            window.open(Manual.ONLINE_MANUAL);
        },
        /**
         * validates whether the current state of the song is
         * eligible for saving / exporting
         */
        isValid(song) {
            let hasContent = SongUtil.hasContent(song);

            if ( !hasContent ) {
                this.showError(this.getCopy('ERROR_EMPTY_SONG'));
                return false;
            }

            if (song.meta.author.length === 0 || song.meta.title.length === 0)
                hasContent = false;

            if (!hasContent)
                this.showError(this.getCopy('ERROR_NO_META'));

            return hasContent;
        },
        handleRecord( aEvent ) {
            Pubsub.publish( Messages.TOGGLE_OUTPUT_RECORDING );
            this.showNotification({ message: this.getCopy('RECORDING_ENABLED') });
        },
        handleSongImport() {
            this.importSong()
                .then(() => this.showNotification({ message: this.getCopy('SONG_IMPORTED') }))
                .catch(error => this.showError(error));
        },
        handleSongExport() {
            if ( this.isValid(this.activeSong)) {
                this.exportSong(this.activeSong)
                    .then(() => this.showNotification({ message: this.getCopy('SONG_EXPORTED', this.activeSong.meta.title) }))
                    .catch(error => this.showError(error));
            }
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

<style lang="scss">
    @import "../styles/_variables.scss";

    #menuSection {
        display: inline;
    }

    #menu {
      color: #b6b6b6;
      display: block;
      margin: 0 auto;
      padding: .5em 0;
      width: 100%;
      @include boxSize;

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
          margin-top: -10px;
          margin-left: -10px;
        }
      }

      ul {
        padding: 0;
        display: inline;

        h1 {
          display: inline;

          a {
            color: $color-1;
            text-decoration: none;
          }
        }
      }

      li {
        a {
          color: #b6b6b6;
          text-decoration: none;
          padding-bottom: 1em;

          &:hover {
            color: $color-1;
            border-bottom: none;
            text-decoration: none;
          }
        }

        &.active {
          a {
            border-bottom: 3px solid #555;
          }
        }
      }
    }

    /* tablet / desktop (everything larger than a phone) */

    @media screen and ( min-width: $mobile-width ) {
      #menu {
        min-width: 100%;
        max-width: $ideal-width;
        margin: 0 auto;
        padding-left: 1em;
      }
    }

    /* ideal view */

    @media screen and ( min-width: $ideal-width ) {
      #menu {
        min-width: auto;
      }
    }

    /* mobile view */

    @media screen and ( max-width: $mobile-width ) {
      #menu {
        position: fixed;
        z-index: 2; // above transport controls
        overflow-x: hidden;
        overflow-y: auto;
        width: 100%;
        height: inherit;
        top: 0;
        left: 0;

        .toggle {
          display: block; // because we have toggle!
        }

        ul {
          h1 {
            display: none;
          }

          li {
            padding: .5em 1em;

            a {
              display: block;
              width: 100%;
              padding: .5em 1em;
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
          }
        }

        #menuList {
          position: absolute;
          top: $menu-height;
          background-image: linear-gradient(to bottom,#fff 35%,#eee 90%);
          background-repeat: repeat-x;
          display: none;

          .title {
            display: none;
          }
        }

        #fileMenu li {
          padding-left: 0;
        }

        &.opened {
          //height: 100%;
          position: absolute;
          #menuList {
            display: block;
            height: 100%;
          }
        }
      }
    }
</style>
