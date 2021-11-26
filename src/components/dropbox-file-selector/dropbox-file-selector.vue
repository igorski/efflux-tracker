/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2021 - https://www.igorski.nl
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
    <div class="dropbox-file-modal">
        <div class="header">
            <h2 v-t="'files'"></h2>
            <button
                type="button"
                class="close-button"
                @click="closeModal()"
            >&#215;</button>
        </div>
        <div class="content">
            <div v-if="leaf">
                <div class="breadcrumbs">
                    <!-- parent folders -->
                    <button
                        v-for="parent in breadcrumbs"
                        :key="parent.path"
                        type="button"
                        @click="handleNodeClick( parent )"
                    >{{ parent.name || "./" }}</button>
                    <!-- current folder -->
                    <button
                        type="button"
                        class="active"
                    >{{ leaf.name }}</button>
                </div>
                <div v-if="!loading" class="file-browser">
                    <!-- files and folders within current leaf -->
                    <p v-if="!filesAndFolders.length" v-t="'noAudioFiles'"></p>
                    <template v-else>
                        <div
                            v-for="node in filesAndFolders"
                            :key="`entry_${node.path}`"
                            class="entry"
                        >
                            <div
                                v-if="node.type === 'folder'"
                                class="entry__icon entry__icon--folder"
                                @click="handleNodeClick( node )"
                            >
                                <span class="title">{{ node.name }}</span>
                            </div>
                            <div
                                v-else-if="node.type === 'xtk'"
                                class="entry__icon entry__icon--project"
                                @click="handleNodeClick( node )"
                            >
                                <span class="title">{{ node.name }}</span>
                            </div>
                            <div
                                v-else
                                :path="node.path"
                                class="entry__icon entry__icon--audio"
                                @click="handleNodeClick( node )"
                            >
                                <span class="title">{{ node.name }}</span>
                            </div>
                            <button
                                type="button"
                                class="entry__delete-button"
                                :title="$t('delete')"
                                @click="handleDeleteClick( node )"
                            >x</button>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { mapMutations, mapActions } from "vuex";
import { listFolder, downloadFileAsBlob, deleteEntry } from "@/services/dropbox-service";
import { ACCEPTED_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import ModalWindows from "@/definitions/modal-windows";
import SampleFactory from "@/model/factories/sample-factory";
import { getAudioContext } from "@/services/audio-service";
import { loadSample } from "@/services/audio/sample-loader";
import { truncate } from "@/utils/string-util";

import messages from "./messages.json";

// we allow listing of both Efflux projects and all accepted audio types
const FILE_EXTENSIONS = [ ...ACCEPTED_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION ]
    .map( ext => ext.replace( ".", "" ));

const LAST_DROPBOX_FOLDER = "efx_dropboxDb";

function mapEntry( entry, children = [], parent = null ) {
    let type = entry[ ".tag" ]; // folder/file
    if ( entry.name.endsWith( PROJECT_FILE_EXTENSION )) {
        type = "xtk";
    }
    return {
        type,
        name: entry.name,
        id: entry.id,
        path: entry.path_lower,
        children,
        parent,
    }
}

function findLeafByPath( tree, path ) {
    let node = tree;
    while ( node ) {
        if ( node.path === path ) {
            return node;
        }
        const found = recurseChildren( node, path );
        if ( found ) {
            return found;
        }
    }
    return null;
}

function recurseChildren( node, path ) {
    const { children } = node;
    if ( !Array.isArray( children )) {
        return null;
    }
    for ( let i = 0, l = children.length; i < l; ++i ) {
        const child = children[ i ];
        if ( child.path === path ) {
            return child;
        } else {
            const found = recurseChildren( child, path );
            if ( found ) {
                return found;
            }
        }
    }
    return null;
}

export default {
    i18n: { messages },
    data: () => ({
        loading: false,
        tree: {
            type: "folder",
            name: "",
            path: "",
            children: [],
        },
        leaf: null,
    }),
    computed: {
        breadcrumbs() {
            let parent = this.leaf.parent;
            const out = [];
            while ( parent ) {
                out.push( parent );
                parent = parent.parent;
            }
            return out.reverse();
        },
        filesAndFolders() {
            return this.leaf.children.filter( entry => {
                // only show folders and audio files
                if ( entry.type === "file" ) {
                    return FILE_EXTENSIONS.some( ext => entry.name.includes( `.${ext}` ));
                }
                return true;
            });
        },
    },
    created() {
        let pathToRetrieve = this.tree.path;
        try {
            const { tree, path } = JSON.parse( sessionStorage.getItem( LAST_DROPBOX_FOLDER ));
            this.tree = { ...this.tree, ...tree };
            pathToRetrieve = path;
        } catch {
            // no tree stored in SessionStorage, continue.
        }
        this.retrieveFiles( pathToRetrieve );
    },
    methods: {
        ...mapMutations([
            "addSample",
            "openDialog",
            "openModal",
            "closeModal",
            "showError",
            "showNotification",
            "setCurrentSample",
            "setDropboxConnected",
            "setLoading",
            "unsetLoading",
        ]),
        ...mapActions([
            "loadSong",
        ]),
        async retrieveFiles( path ) {
            this.loading = true;
            try {
                const entries = await listFolder( path );
                this.setDropboxConnected( true ); // opened browser implies we have a valid connection

                const leaf   = findLeafByPath( this.tree, path );
                const parent = { type: "folder", name: leaf.name, parent: leaf.parent, path };
                // populate leaf with fetched children
                leaf.children = ( entries?.map( entry => mapEntry( entry, [], parent )) ?? [] )
                    .sort(( a, b ) => {
                        if ( a.type < b.type ) {
                            return 1;
                        } else if ( a.type > b.type ) {
                            return -1;
                        }
                        return a.name.localeCompare( b.name );
                    });
                this.leaf = leaf;
            } catch {
                this.openDialog({ type: "error", message: this.$t( "couldNotRetrieveFilesForPath", { path } ) });
                sessionStorage.removeItem( LAST_DROPBOX_FOLDER );
            }
            this.loading = false;
        },
        async handleNodeClick( node ) {
            this.setLoading( "dbox" );
            switch ( node.type ) {
                case "folder":
                    await this.retrieveFiles( node.path );
                    // cache the currently visited tree
                    sessionStorage.setItem( LAST_DROPBOX_FOLDER, JSON.stringify({ path: node.path, tree: this.tree }));
                    break;
                case "xtk":
                    this.setLoading( "dbi" );
                    try {
                        const blob = await downloadFileAsBlob( node.path );
                        this.loadSong({ file: blob, origin: "dropbox" });
                    } catch {
                        this.openDialog({ type: "error", message: this.$t( "couldNotDownloadFile", { file: node.path }) });
                    }
                    this.unsetLoading( "dbi" );
                    this.closeModal();
                    break;
                case "file":
                    this.setLoading( "dbd" );
                    let source, buffer;
                    try {
                        source = await downloadFileAsBlob( node.path );
                        buffer = await loadSample( source, getAudioContext() );
                    } catch {
                        this.openDialog({ type: "error", message: this.$t( "couldNotDownloadFile", { file: node.path }) });
                    }
                    this.unsetLoading( "dbd" );
                    if ( buffer ) {
                        const sample = SampleFactory.create( source, buffer, node.name );
                        this.addSample( sample );
                        this.setCurrentSample( sample );
                        this.openModal( ModalWindows.SAMPLE_EDITOR );
                        this.showNotification({
                            message: this.$t( "importedFileSuccessfully", { file: truncate( node.name, 35 ) })
                        });
                    } else {
                        this.showError( this.$t( "couldNotImportFile", { file: truncate( node.name, 35 ) } ));
                        this.closeModal();
                    }
                    break;
            }
            this.unsetLoading( "dbox" );
        },
        handleDeleteClick({ path }) {
            this.openDialog({
                type: "confirm",
                message: this.$t( "deleteEntryWarning", { entry: path }),
                confirm: async () => {
                    const success = await deleteEntry( path );
                    if ( success ) {
                        this.showNotification({
                            message: this.$t( "entryDeletedSuccessfully", { entry: path })
                        });
                        this.retrieveFiles( this.leaf.path );
                    } else {
                        this.showError( this.$t( "couldNotDeleteEntry", { entry: path } ));
                    }
                },
            });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/typography";

.dropbox-file-modal {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;

    .header {
        padding: $spacing-small $spacing-large 0;
    }


    h2 {
        color: #FFF;
    }

    @include large() {
        width: 80%;
        height: 75%;
        max-width: 1280px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    .file-browser {
        overflow: auto;
        padding: $spacing-small $spacing-large;
    }
}

.breadcrumbs {
    padding: $spacing-medium 0;
    margin: $spacing-medium 0 $spacing-small;
    background-color: #b6b6b6;

    button {
        display: inline;
        position: relative;
        cursor: pointer;
        margin-right: $spacing-small;
        border: none;
        background: none;
        padding: 0 $spacing-small;
        border-left: 1px solid $color-3;
        font-size: 100%;
        @include toolFont();

        &:hover, &.active {
            color: #FFF;
        }
    }
}

.entry {
    display: inline-block;
    position: relative;
    width: 128px;
    height: 128px;
    text-align: center;
    cursor: pointer;
    @include toolFont();

    .title {
        position: absolute;
        left: $spacing-small;
        bottom: $spacing-medium;
        width: 90%;
        @include truncate();
    }

    &__icon {
        width: inherit;
        height: inherit;

        &--folder {
            background: url("../../assets/icons/icon-folder.png") no-repeat 50% $spacing-large;
            background-size: 50%;
        }

        &--project {
            background: url("../../assets/icons/icon-project.svg") no-repeat 50% $spacing-large;
            background-size: 50%;
        }

        &--audio {
            background: url("../../assets/icons/icon-audio.png") no-repeat 50% $spacing-large;
            background-size: 50%;
        }
    }

    &__delete-button {
        display: none;
        position: absolute;
        cursor: pointer;
        top: -$spacing-small;
        right: -$spacing-small;
        background-color: $color-2;
        color: #000;
        width: $spacing-large;
        height: $spacing-large;
        border: none;
        border-radius: 50%;
    }

    &:hover {
        .entry__icon {
            background-color: $color-1;
            color: #000;
        }

        .entry__delete-button {
            display: block;
        }
    }
}
</style>
