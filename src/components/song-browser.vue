/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2019 - https://www.igorski.nl
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
            <h2>Songs</h2>
            <button type="button"
                    class="close-button"
                    @click="$emit('close')"
            >x</button>
        </div>
        <ul class="songList">
            <li v-for="(song, index) in songs"
                :key="`song_${index}`"
                @click="openSongClick(song.id)"
            >
                <span class="title">{{ `${song.meta.title}, by ${song.meta.author}` }}</span>
                <span class="date">{{ getSongDate(song) }}</span>
                <span class="delete" @click.stop.prevent="deleteSongClick(song.id)">x</span>
            </li>
        </ul>
    </div>
</template>

<script>
import { mapGetters, mapMutations, mapActions } from 'vuex';
import Time from '../utils/time-util';

export default {
    computed: {
        ...mapGetters([
            'getCopy',
            'getSongById',
            'songs',
        ]),
    },
    watch: {
        songs: {
            immediate: true,
            handler(songs) {
                if (songs.length === 0 ) {
                    this.openDialog({ title: this.getCopy('ERROR_TITLE'), message: this.getCopy('ERROR_NO_SONGS') });
                }
            }
        },
    },
    methods: {
        ...mapMutations([
            'openDialog',
            'setActiveSong',
        ]),
        ...mapActions([
            'deleteSong',
        ]),
        getSongDate(song) {
            return Time.timestampToDate(song.meta.modified);
        },
        openSongClick(songId) {
            this.setActiveSong(this.getSongById(songId));
            this.$emit('close');
        },
        deleteSongClick(songId) {
            const song = this.getSongById(songId);

            if (!song) {
                return;
            }
            const self = this;
            this.openDialog({
                type: 'confirm',
                message:  this.getCopy('SONG_DELETE_CONFIRM', song.meta.title),
                confirm() {
                    self.deleteSong({ song });
                }
            });
        }
    }
};
</script>

<style lang='scss' scoped>
    @import '../styles/_variables.scss';
    @import '../styles/_layout.scss';

    $songBrowserWidth: 800px;
    $songBrowserHeight: 600px;

    .song-browser {
        @include overlay();
        @include noSelect();
        box-shadow: 0 0 $spacing-small rgba(0, 0, 0, .5);
        padding: 0;
        top: 50%;
        left: 50%;
        width: $songBrowserWidth;
        margin-left: -($songBrowserWidth / 2);
        height: $songBrowserHeight;
        margin-top: -($songBrowserHeight / 2);
        overflow: scroll;
        background-color: #323234;
        color: #b6b6b6;
        overflow-x: hidden;
        overflow-y: auto;

        .header {
            @include boxSize();
            background-color: $color-1;
            padding: $spacing-small 0;
            border-bottom: 2px solid #333;
            width: 100%;

            h2 {
                color: #000;
            }
        }

        ul {
            width: 100%;
            list-style-type: none;
        }

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
                width: 55%;
                @include textOverflow();
                vertical-align: middle;
            }

            .date {
                width: 40%;
                padding-left: $spacing-small;
                @include boxSize();
            }

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

    @media screen and ( max-width: $songBrowserWidth ), ( max-height: $songBrowserHeight ) {
        .song-browser {
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            border-radius: 0;
            z-index: 2000;
        }
    }
</style>
 