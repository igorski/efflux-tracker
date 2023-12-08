/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2023 - https://www.igorski.nl
*
* Permission is hereby granted, free of charge, to any person obtaining a copy of
* this software and associated documentation files (the 'Software'), to deal in
* the Software without restriction, including without limitation the rights to
* use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
* the Software, and to permit persons to whom the Software is furnished to do so,
* subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
* FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
* COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
* IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
<template>
    <div class="song-browser">
        <div class="header">
            <h2 v-t="'songs'"></h2>
            <button
                type="button"
                class="close-button"
                @click="$emit('close')"
            >x</button>
            <section class="song-browser__explanation">
                <hr class="divider" />
                <div v-t="'localSongsExpl'" class="song-browser__explanation-text"></div>
            </section>
        </div>
        <hr class="divider" />
        <ul class="song-list">
            <li
                v-for="( song, index ) in mappedSongs"
                :key="`song_${index}`"
                @click="openSongClick( song.id )"
            >
                <span class="title">{{ $t( "titleByAuthor", { title: song.meta.title, author: song.meta.author }) }}</span>
                <!-- <span class="date">{{ getSongDate(song) }}</span> -->
                <span class="type">{{ song.type }}</span>
                <span class="size">{{ song.size }}</span>
                <button
                    type="button"
                    class="action-button"
                    :title="$t('exportSong')"
                    @click.stop="exportSongClick( song.id )"
                ><img src="@/assets/icons/icon-download.svg" :alt="$t('exportSong')" /></button>
                <button
                    type="button"
                    class="action-button"
                    :title="$t('deleteSong')"
                    @click.stop="deleteSongClick( song.id )"
                ><img src="@/assets/icons/icon-trashcan.svg" :alt="$t('deleteSong')" /></button>
            </li>
        </ul>
        <hr class="divider divider--bottom" />
        <div class="footer">
            <file-loader
                file-types="project"
                class="file-loader"
            />
            <button
                v-t="'importFile'"
                type="button"
                class="import-button"
                @click="handleSongImport()"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import { mapGetters, mapMutations, mapActions } from "vuex";
import FileLoader from "@/components/file-loader/file-loader.vue";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { type EffluxSong, EffluxSongType } from "@/model/types/song";
import { SONG_STORAGE_KEY, getStorageKeyForSong } from "@/store/modules/song-module";
import { openFileBrowser } from "@/utils/file-util";
import Time from "@/utils/time-util";
import StorageUtil from "@/utils/storage-util";
import sharedMessages from "@/messages.json";
import messages from "./messages.json";

type WrappedSongEntry = EffluxSong & {
    size: number;
    type: string;
};

export default {
    emits: ["close"],
    i18n: { messages, sharedMessages },
    components: {
        FileLoader,
    },
    computed: {
        ...mapGetters([
            "hasChanges",
            "getSongById",
            "songs"
        ]),
        mappedSongs(): WrappedSongEntry[] {
            const sizes = StorageUtil.getItemSizes( SONG_STORAGE_KEY );
            return this.songs.map( song => ({
                ...song,
                size: sizes[ getStorageKeyForSong( song )],
                type: song.type === EffluxSongType.JAM ? this.$t( "jam" ) : this.$t( "tracker" ),
            })).sort(( a, b ) => a.meta.title.toLowerCase().localeCompare( b.meta.title.toLowerCase()));
        }
    },
    watch: {
        songs: {
            immediate: true,
            handler( songs ): void {
                if ( songs.length === 0 ) {
                    this.openDialog({ title: this.$t( "error" ), message: this.$t( "errorNoSongs" ) });
                }
            }
        },
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "showError",
            "showNotification"
        ]),
        ...mapActions([
            "openSong",
            "loadSongFromLS",
            "deleteSongFromLS",
            "importSong",
            "exportSong"
        ]),
        getSongDate( song: EffluxSong ): void {
            return Time.timestampToDate( song.meta.modified );
        },
        openSongClick( songId: string ): void {
            const open = async () => {
                try {
                    const song = await this.loadSongFromLS( this.getSongById( songId ));
                    this.openSong( song );
                    this.$emit( "close" );
                } catch {
                    this.showError( this.$t( "errorSongImport", { extension: PROJECT_FILE_EXTENSION }));
                }
            };
            if ( this.hasChanges ) {
                this.openDialog({
                    type: "confirm",
                    message: this.$t( "warnings.loadNewPendingChanges" ),
                    confirm: () => open(),
                });
            } else {
                open();
            }
        },
        async exportSongClick( songId: string ): Promise<void> {
            try {
                const song = await this.loadSongFromLS( this.getSongById( songId ));
                await this.exportSong( song );
                this.showNotification({ message: this.$t( "songExported", { song: song.meta.title }) });
            } catch {
                this.showError( this.$t( "errorSongExport" ));
            }
        },
        deleteSongClick( songId: string ): void {
            const song = this.getSongById( songId );
            if ( !song ) {
                return;
            }
            this.openDialog({
                type: "confirm",
                message: this.$t( "confirmSongDelete", { song: song.meta.title }),
                confirm: () => {
                    this.deleteSongFromLS({ song });
                }
            });
        },
        handleSongImport(): void {
            openFileBrowser( async fileBrowserEvent => {
                const file = fileBrowserEvent.target.files?.[ 0 ];
                if ( !file ) {
                    return;
                }
                this.importSong( file ).then(() => this.showNotification({ message: this.$t( "songImported" ) }));
            }, [ PROJECT_FILE_EXTENSION ] );
        },
    }
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@import "@/styles/_mixins";
@import "@/styles/typography";

$songBrowserWidth: 750px;
$songBrowserHeight: 500px;
$headerFooterHeight: 184px;
$headerFooterHeightNoExpl: 102px;

.song-browser {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;

    .header,
    .footer {
        padding: $spacing-small $spacing-large 0;
    }

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin-left: -$spacing-large;
        margin-bottom: 0;
    }

    .import-button {
        @include button();
        display: inline-block;
    }

    .file-loader {
        margin-top: $spacing-xsmall;
        display: inline-block;
    }

    &__explanation-text {
        padding: $spacing-medium 0 0;
        @include boxSize();
        width: 90%;
    }

    @include componentIdeal( $songBrowserWidth, $songBrowserHeight ) {
        width: $songBrowserWidth;
        height: $songBrowserHeight;
        top: 50%;
        left: 50%;
        margin-left: math.div( -$songBrowserWidth, 2 );
        margin-top: math.div( -$songBrowserHeight, 2 );

        .song-list {
            height: calc(#{$songBrowserHeight - $headerFooterHeight});
        }
    }

    @include componentFallback( $songBrowserWidth, $songBrowserHeight ) {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
        z-index: $z-window;

        &__explanation {
            display: none;
        }

        .song-list {
            height: calc(100% - #{$headerFooterHeightNoExpl});
        }
    }
}

.song-list {
    @include list();
    width: 100%;
    overflow-y: auto;

    li {
        @include titleFont();
        @include boxSize();
        display: flex;
        align-items: center;
        width: 100%;
        padding: $spacing-small $spacing-large;
        cursor: pointer;
        background-color: $color-pattern-even;

        .title, .date {
            @include noEvents();
        }

        .title {
            flex: 1;
            @include truncate();
        }

        .type {
            width: 15%;
        }

        .size {
            width: 15%;
        }
/*
        .date {
            width: 40%;
            padding-left: $spacing-small;
            @include boxSize();
        }
*/
        .action-button {
            width: #{$spacing-large + $spacing-xsmall};
            @include ghostButton();

            &:hover {
                filter: brightness(0) invert(1) !important;
            }
        }

        @include mobile() {
            .title {
                width: 90%;
            }
            .type,
            .size {
                display: none;
            }
        }

        &:nth-child(odd) {
            background-color: $color-pattern-odd;
        }

        &:hover {
            background-color: $color-5;
            color: #000;

            .action-button {
                filter: brightness(0);
            }
        }
    }
}
</style>
