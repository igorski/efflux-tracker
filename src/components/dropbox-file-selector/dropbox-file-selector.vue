/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
            <h2 v-t="'files'" class="header__title"></h2>
            <button
                type="button"
                class="close-button"
                @click="closeModal()"
            >&#215;</button>
        </div>
        <hr class="divider" />
        <div class="component__content">
            <div v-if="leaf" class="content__wrapper">
                <div class="breadcrumbs">
                    <!-- parent folders -->
                    <button
                        v-for="parent in breadcrumbs"
                        :key="parent.path"
                        type="button"
                        class="breadcrumbs__button"
                        @click="handleNodeClick( parent )"
                    >{{ parent.name || "." }}</button>
                    <!-- current folder -->
                    <button
                        type="button"
                        class="breadcrumbs__button breadcrumbs__button--active"
                    >{{ leaf.name }}</button>
                </div>
                <div v-if="!loading" class="content__folders">
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
        <div class="component__actions">
            <div class="component__actions-content">
                <div class="form component__actions-form">
                    <div class="wrapper input">
                        <input
                            v-model="newFolderName"
                            :placeholder="$t('newFolderName')"
                            type="text"
                            class="input-field full"
                            @focus="handleFocusIn"
                            @blur="handleFocusOut"
                        />
                    </div>
                </div>
                <button
                    v-t="'createFolder'"
                    type="button"
                    class="button"
                    :disabled="!newFolderName"
                    @click="handleCreateFolderClick()"
                ></button>
            </div>
        </div>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import { listFolder, createFolder, downloadFileAsBlob, deleteEntry } from "@/services/dropbox-service";
import { ACCEPTED_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION } from "@/definitions/file-types";
import ModalWindows from "@/definitions/modal-windows";
import SampleFactory from "@/model/factories/sample-factory";
import { getAudioContext } from "@/services/audio-service";
import { loadSample } from "@/services/audio/sample-loader";
import { truncate } from "@/utils/string-util";
import sharedMessages from "@/messages.json";

import messages from "./messages.json";

// we allow listing of both Efflux projects and all accepted audio types
const FILE_EXTENSIONS = [ ...ACCEPTED_FILE_EXTENSIONS, PROJECT_FILE_EXTENSION ]
    .map( ext => ext.replace( ".", "" ));

const RETRIEVAL_LOAD_KEY  = "dbx_r";
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
    i18n: { messages, sharedMessages },
    data: () => ({
        tree: {
            type: "folder",
            name: "",
            path: "",
            children: [],
        },
        leaf: null,
        newFolderName: "",
    }),
    computed: {
        ...mapState([
            "loadingStates",
        ]),
        ...mapGetters([
            "hasChanges",
        ]),
        loading() {
            return this.loadingStates.includes( RETRIEVAL_LOAD_KEY );
        },
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
            "suspendKeyboardService",
            "unsetLoading",
        ]),
        ...mapActions([
            "loadSong",
        ]),
        /**
         * when typing, we want to suspend the KeyboardController
         * so it doesn't broadcast the typing to its listeners
         */
        handleFocusIn() {
            this.suspendKeyboardService( true );
        },
        /**
         * on focus out, restore the KeyboardControllers broadcasting
         */
        handleFocusOut() {
            this.suspendKeyboardService( false );
        },
        async retrieveFiles( path ) {
            this.setLoading( RETRIEVAL_LOAD_KEY );
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
            this.unsetLoading( RETRIEVAL_LOAD_KEY );
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
                    const open = async () => {
                        this.setLoading( "dbi" );
                        try {
                            const blob = await downloadFileAsBlob( node.path );
                            this.loadSong({ file: blob, origin: "dropbox" });
                        } catch {
                            this.openDialog({ type: "error", message: this.$t( "couldNotDownloadFile", { file: node.path }) });
                        }
                        this.unsetLoading( "dbi" );
                        this.closeModal();
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
        async handleCreateFolderClick() {
            const folder = this.newFolderName;
            try {
                const result = await createFolder( this.leaf.path, folder );
                if ( !result ) {
                    throw new Error();
                }
                this.retrieveFiles( this.leaf.path );
                this.newFolderName = "";
                this.showNotification({
                    message: this.$t( "folderCreatedSuccessfully", { folder })
                });
            } catch {
                this.showNotification({
                    message: this.$t( "couldNotCreateFolder", { folder })
                });
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";
@import "@/styles/typography";

$headingHeight: 53px;
$breadcrumbsHeight: 47px;
$actionsHeight: 50px;

.dropbox-file-modal {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    overflow: hidden;
    padding: 0;

    .header {
        padding: $spacing-small $spacing-large 0;
    }

    .divider {
        margin-bottom: 0;
    }

    @include large() {
        width: 80%;
        height: 75%;
        max-width: 1280px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    .content__wrapper {
        height: 100%;
    }

    .content__folders {
        overflow: auto;
        height: calc(100% - #{$headingHeight + $breadcrumbsHeight + $actionsHeight});
    }
}

.breadcrumbs {
    padding: $spacing-small 0 $spacing-small $spacing-small;
    background-color: $color-background;

    &__button {
        display: inline;
        position: relative;
        cursor: pointer;
        border: none;
        background: none !important;
        padding-left: $spacing-xsmall;
        padding-right: 0;
        font-size: 100%;

        &:after {
            content: " /";
        }

        &:hover {
            color: $color-1;
        }

        &--active {
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
        right: -#{$spacing-medium + $spacing-small};
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

.component__actions {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: $actionsHeight;
    border-top: 1px dashed #666;
    text-align: center;
    display: flex;
    box-sizing: border-box;
    background-color: $color-editor-background;
    padding: $spacing-xxsmall $spacing-medium;

    button {
        flex: 1;
        margin: $spacing-small;
    }

    &-content {
        display: flex;
        width: 100%;
        max-width: 400px;
        margin-left: auto;
        align-items: baseline;
    }
}
</style>
