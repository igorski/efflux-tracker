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
    <div>
        <button
            v-t="buttonText.local"
            type="button"
            @click="loadFile()"
        ></button>
        <button
            v-if="!dropbox"
            v-t="buttonText.dropbox"
            type="button"
            class="dropbox-button"
            @click="dropbox = true"
        ></button>
        <component :is="cloudImportType" />
    </div>
</template>

<script lang="ts">
import { type Component } from "vue";
import { mapMutations, mapActions } from "vuex";
import { ACCEPTED_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import ModalWindows from "@/definitions/modal-windows";
import SampleFactory from "@/model/factories/sample-factory";
import { getAudioContext } from "@/services/audio-service";
import { loadSample } from "@/services/audio/sample-loader";
import { openFileBrowser } from "@/utils/file-util";
import { truncate } from "@/utils/string-util";

import messages from "./messages.json";

export default {
    i18n: { messages },
    props: {
        fileTypes: {
            type: String,
            validator: value => /all|project|audio/.test( value ),
            default: "all",
        },
    },
    data: () => ({
        dropbox: false,
    }),
    computed: {
        buttonText(): { local: string, dropbox: string } {
            const useImport = this.fileTypes === "audio";
            return {
                local   : useImport ? "importFile" : "loadFile",
                dropbox : useImport ? "importFromDropbox" : "loadFromDropbox"
            };
        },
        /**
         * Cloud import are loaded at runtime to omit packaging
         * third party SDK within the core bundle.
         */
        cloudImportType(): (() => Promise<Component> ) | null {
            switch ( this.dropbox ) {
                default:
                    return null;
                case true:
                    return () => import( "@/components/dropbox-connector/dropbox-connector.vue" );
            }
        },
        acceptedFiles(): string[] {
            switch ( this.fileTypes ){
                default:
                    return [ ...ACCEPTED_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION ];
                case "audio":
                    return ACCEPTED_FILE_EXTENSIONS;
                case "project":
                    return [ PROJECT_FILE_EXTENSION ];
            }
        },
    },
    methods: {
        ...mapMutations([
            "addSample",
            "cacheSample",
            "closeModal",
            "openModal",
            "setCurrentSample",
            "showError",
            "showNotification",
        ]),
        ...mapActions([
            "loadSong",
        ]),
        loadFile(): void {
            openFileBrowser( async fileBrowserEvent => {
                const file = fileBrowserEvent.target.files?.[ 0 ];
                if ( !file ) {
                    return;
                }
                if ( file.name.endsWith( PROJECT_FILE_EXTENSION )) {
                    await this.loadSong({ file });
                    this.closeModal();
                } else {
                    const buffer = await loadSample( file, getAudioContext() );
                    if ( buffer ) {
                        const sample = SampleFactory.create( file, buffer, file.name );
                        this.addSample( sample );
                        this.cacheSample( sample );
                        this.setCurrentSample( sample );
                        this.openModal( ModalWindows.SAMPLE_EDITOR );
                        this.showNotification({
                            message: this.$t( "importedFileSuccessfully", { file: truncate( file.name, 35 ) })
                        });
                    } else {
                        this.showError( this.$t( "couldNotImportFile", { file: truncate( file.name, 35 ) } ));
                        this.closeModal();
                    }
                }
            }, this.acceptedFiles );
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";
@import "@/styles/thirdparty";
</style>
