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
            <button type="button"
                    class="close-button"
                    @click="$emit('close')"
            >x</button>
        </div>
        <hr class="divider" />
        <ul class="song-list">
            <li v-for="(song, index) in songs"
                :key="`song_${index}`"
                @click="openSongClick(song.id)"
            >
                <span class="title">{{ `${song.meta.title}, by ${song.meta.author}` }}</span>
                <!-- <span class="date">{{ getSongDate(song) }}</span> -->
                <span class="delete"
                      @click.stop.prevent="deleteSongClick(song.id)"
                >x</span>
            </li>
        </ul>
    </div>
</template>

<script>
import { mapGetters, mapMutations, mapActions } from 'vuex';
import Config from '@/config';
import Time from '@/utils/time-util';
import messages from './messages.json';

export default {
    i18n: { messages },
    computed: {
        ...mapGetters([
            'getSongById',
            'songs'
        ]),
    },
    watch: {
        songs: {
            immediate: true,
            handler(songs) {
                if (songs.length === 0 ) {
                    this.openDialog({ title: this.$t('error'), message: this.$t('errorNoSongs') });
                }
            }
        },
    },
    methods: {
        ...mapMutations([
            'openDialog',
            'setActiveSong',
            'showError'
        ]),
        ...mapActions([
            'loadSong',
            'deleteSong'
        ]),
        getSongDate(song) {
            return Time.timestampToDate(song.meta.modified);
        },
        async openSongClick(songId) {
            try {
                const song = await this.loadSong(this.getSongById(songId));
                this.setActiveSong(song);
                this.$emit('close');
            } catch(e) {
                this.showError(this.$t('errorSongImport', { extension: Config.SONG_FILE_EXTENSION }));
            }
        },
        deleteSongClick(songId) {
            const song = this.getSongById(songId);

            if (!song) {
                return;
            }
            const self = this;
            this.openDialog({
                type: 'confirm',
                message:  this.$t('confirmSongDelete', { song: song.meta.title }),
                confirm() {
                    self.deleteSong({ song });
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

.song-browser {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;

    .header {
        padding: $spacing-small $spacing-large 0;
    }

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin-left: -$spacing-large;
        margin-bottom: 0;
    }

    @include componentIdeal( $songBrowserWidth, $songBrowserHeight ) {
        width: $songBrowserWidth;
        height: $songBrowserHeight;
        top: 50%;
        left: 50%;
        margin-left: -( $songBrowserWidth / 2 );
        margin-top: -( $songBrowserHeight / 2 );
    }

    @include componentFallback( $songBrowserWidth, $songBrowserHeight ) {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
        z-index: 2000;
    }
}

.song-list {
    @include list();
    width: 100%;

    li {
        @include boxSize();
        @include animate(padding, .1s);
        float: left;
        width: 100%;
        padding: $spacing-small $spacing-large;
        cursor: pointer;
        border-bottom: 1px solid #53565c;
        font-family: Montserrat, Helvetica, sans-serif;

        .title, .date, .delete {
            display: inline-block;
        }

        .title, .date {
            @include noEvents();
        }

        .title {
            width: 95%;
            @include truncate();
            vertical-align: middle;
        }
/*
        .date {
            width: 40%;
            padding-left: $spacing-small;
            @include boxSize();
        }
*/
        .delete {
            width: 5%;
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
