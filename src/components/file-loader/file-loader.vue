<template>
    <div>
        <button
            v-t="'loadFile'"
            type="button"
            @click="importSong"
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
import { mapActions } from "vuex";
import messages from "./messages.json";

export default {
    i18n: { messages },
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
    },
    methods: {
        ...mapActions([
            "importSong",
        ]),
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";
@import "@/styles/thirdparty";
</style>
