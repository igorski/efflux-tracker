<template>
    <div>
        <button
            v-t="'loadFile'"
            type="button"
            @click="importFile()"
        ></button>
        <button
            v-if="!dropbox"
            v-t="'importFromDropbox'"
            type="button"
            class="dropbox-button"
            @click="dropbox = true"
        ></button>
        <component :is="cloudImportType" />
    </div>
</template>

<script>
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
        /**
         * Cloud import are loaded at runtime to omit packaging
         * third party SDK within the core bundle.
         */
        cloudImportType() {
            switch ( this.dropbox ) {
                default:
                    return null;
                case true:
                    return () => import( "@/components/dropbox-connector/dropbox-connector" );
            }
        },
        acceptedFiles() {
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
            "closeModal",
            "openModal",
            "setCurrentSample",
            "showError",
            "showNotification",
        ]),
        ...mapActions([
            "loadSong",
        ]),
        importFile() {
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
                        const sample = SampleFactory.fromBuffer( buffer, file.name );
                        this.addSample( sample );
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
