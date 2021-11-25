/**
* The MIT License (MIT)
*
* Igor Zinken 2021 - https://www.igorski.nl
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
    <div class="instrument-manager">
        <div class="header">
            <h2 v-t="'instrumentManager'"></h2>
            <button
                type="button"
                class="close-button"
                @click="$emit('close')"
            >x</button>
        </div>
        <hr class="divider" />
        <ul class="instrument-list">
            <li
                v-for="instrument in mappedInstruments"
                :key="instrument.presetName"
            >
                <span class="title">{{ instrument.presetName }}</span>
                <span class="size">{{ instrument.size }}</span>
                <button
                    type="button"
                    class="delete-button"
                    @click.stop="requestDelete( instrument )"
                >x</button>
            </li>
        </ul>
        <hr class="divider" />
        <div v-if="hasImportExport" class="footer">
            <button
                v-t="'importInstruments'"
                type="button"
                class="button"
                @click="handleInstrumentImport()"
            ></button>
            <button
                v-t="'exportInstruments'"
                type="button"
                class="button"
                @click="handleInstrumentExport()"
            ></button>
        </div>
    </div>
</template>

<script>
import { mapState, mapMutations, mapActions } from "vuex";
import { INSTRUMENT_STORAGE_KEY, getStorageKeyForInstrument } from "@/store/modules/instrument-module";
import StorageUtil from "@/utils/storage-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapState({
            instruments : state => state.instrument.instruments,
        }),
        mappedInstruments() {
            const sizes = StorageUtil.getItemSizes( INSTRUMENT_STORAGE_KEY );
            return this.instruments.map( instrument => ({
                ...instrument,
                size: sizes[ getStorageKeyForInstrument( instrument )]
            })).sort(( a, b ) => {
                if( a.presetName < b.presetName ) return -1;
                if( a.presetName > b.presetName ) return 1;
                return 0;
            });
        }
    },
    created() {
        this.hasImportExport = typeof window.btoa !== "undefined" && typeof window.FileReader !== "undefined";
    },
    methods: {
        ...mapMutations([
            "openDialog",
            "showNotification",
            "setLoading",
            "unsetLoading",
        ]),
        ...mapActions([
            "deleteInstrument",
            "exportInstruments",
            "importInstruments",
        ]),
        requestDelete( instrument ) {
            this.openDialog({
                type: "confirm",
                message: this.$t( "confirmInstrumentDelete", { instrument: instrument.presetName }),
                confirm: () => {
                    this.deleteInstrument({ instrument });
                }
            });
        },
        async handleInstrumentImport() {
            try {
                const amountImported = await this.importInstruments();
                this.showNotification({ message: this.$t( "instrumentsImported", { amount: amountImported.toString() }) });
            } catch ( error ) {
                this.showError( error );
            }
        },
        async handleInstrumentExport() {
            try {
                this.setLoading( "exp" );
                await this.exportInstruments();
                this.showNotification({ message: this.$t( "instrumentsExported" ) });
            } catch ( error ) {
                this.showError( error );
            }
            this.unsetLoading( "exp" );
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/typography";

$width: 750px;
$height: 500px;
$headerFooterHeight: 128px;

.instrument-manager {
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

    @include componentIdeal( $width, $height ) {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        margin-left: -( $width / 2 );
        margin-top: -( $height / 2 );

        .instrument-list {
            height: calc(#{$height - $headerFooterHeight});
        }
    }

    @include componentFallback( $width, $height ) {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
        z-index: 2000;

        .instrument-list {
            height: calc(100% - #{$headerFooterHeight});
        }
    }
}

.instrument-list {
    @include list();
    width: 100%;
    overflow-y: auto;

    li {
        @include boxSize();
        float: left;
        width: 100%;
        padding: $spacing-small $spacing-large;
        border-bottom: 1px solid #53565c;
        font-family: Montserrat, Helvetica, sans-serif;

        .title, .size, .delete-button {
            display: inline-block;
        }

        .title {
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
    }
}
</style>
