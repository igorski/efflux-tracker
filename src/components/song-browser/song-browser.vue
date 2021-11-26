/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2021 - https://www.igorski.nl
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
        </div>
        <hr class="divider" />
        <ul class="song-list">
            <li
                v-for="( song, index ) in mappedSongs"
                :key="`song_${index}`"
                @click="openSongClick( song.id )"
            >
                <span class="title">{{ `${song.meta.title}, by ${song.meta.author}` }}</span>
                <!-- <span class="date">{{ getSongDate(song) }}</span> -->
                <span class="size">{{ song.size }}</span>
                <button
                    type="button"
                    class="delete-button"
                    :title="$t('deleteSong')"
                    @click.stop="deleteSongClick( song.id )"
                ><img src="@/assets/icons/icon-trashcan.svg" :alt="$t('deleteSong')" /></button>
            </li>
        </ul>
        <hr class="divider" />
        <div class="footer">
            <file-loader
                file-types="project"
                class="file-loader"
            />
        </div>
    </div>
</template>

<script>
import { mapGetters, mapMutations, mapActions } from "vuex";
import FileLoader from "@/components/file-loader/file-loader";
import { PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import { SONG_STORAGE_KEY, getStorageKeyForSong } from "@/store/modules/song-module";
import Time from "@/utils/time-util";
import StorageUtil from "@/utils/storage-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        FileLoader,
    },
    computed: {
        ...mapGetters([
            "getSongById",
            "songs"
        ]),
        mappedSongs() {
            const sizes = StorageUtil.getItemSizes( SONG_STORAGE_KEY );
            return this.songs.map( song => ({
                ...song,
                size: sizes[ getStorageKeyForSong( song )]
            })).sort(( a, b ) => {
                if ( a.meta.title < b.meta.title ) return -1;
                if ( a.meta.title > b.meta.title ) return 1;
                return 0;
            });
        }
    },
    watch: {
        songs: {
            immediate: true,
            handler( songs ) {
                if ( songs.length === 0 ) {
                    this.openDialog({ title: this.$t( "error" ), message: this.$t( "errorNoSongs" ) });
                }
            }
        },
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "showError"
        ]),
        ...mapActions([
            "openSong",
            "loadSongFromLS",
            "deleteSongFromLS"
        ]),
        getSongDate(song) {
            return Time.timestampToDate(song.meta.modified);
        },
        async openSongClick(songId) {
            try {
                const song = await this.loadSongFromLS( this.getSongById( songId ));
                this.openSong( song );
                this.$emit( "close" );
            } catch(e) {
                this.showError( this.$t( "errorSongImport", { extension: PROJECT_FILE_EXTENSION }));
            }
        },
        deleteSongClick(songId) {
            const song = this.getSongById( songId );
            if ( !song ) {
                return;
            }
            this.openDialog({
                type: "confirm",
                message:  this.$t( "confirmSongDelete", { song: song.meta.title }),
                confirm: () => {
                    this.deleteSongFromLS({ song });
                }
            });
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/typography";

$songBrowserWidth: 750px;
$songBrowserHeight: 500px;
$headerFooterHeight: 128px;

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

    .file-loader {
        margin-top: $spacing-xsmall;
    }

    @include componentIdeal( $songBrowserWidth, $songBrowserHeight ) {
        width: $songBrowserWidth;
        height: $songBrowserHeight;
        top: 50%;
        left: 50%;
        margin-left: -( $songBrowserWidth / 2 );
        margin-top: -( $songBrowserHeight / 2 );

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
        z-index: 2000;

        .song-list {
            height: calc(100% - #{$headerFooterHeight});
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
        @include animate(padding, .1s);
        float: left;
        width: 100%;
        padding: $spacing-small $spacing-large;
        cursor: pointer;
        border-bottom: 1px solid #53565c;

        .title, .size, .delete-button {
            display: inline-block;
        }

        .title, .date {
            @include noEvents();
        }

        .title {
            width: 80%;
            @include truncate();
            vertical-align: middle;
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
        .delete-button {
            width: 5%;
            @include ghostButton();
        }

        @include mobile() {
            .title {
                width: 95%;
            }
            .size {
                display: none;
            }
        }

        &:nth-child(even) {
            background-color: #53565c;
            /*color: #FFF;*/
        }

        &:hover {
            background-color: $color-5;
            color: #000;
            padding: $spacing-medium $spacing-large;
        }
    }
}
</style>
