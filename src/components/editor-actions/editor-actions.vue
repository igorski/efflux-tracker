/**
* The MIT License (MIT)
*
* Igor Zinken 2019-2023 - https://www.igorski.nl
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
    <section
        id="editorActions"
        ref="container"
    >
        <div class="action__controls">
            <button
                type="button"
                class="action__controls-button undo"
                :class="{ disabled: !canUndo }"
                :title="$t('undo')"
                @click="navigateHistory('undo')"
            ></button>
            <button
                type="button"
                class="action__controls-button redo"
                :class="{ disabled: !canRedo }"
                :title="$t('redo')"
                @click="navigateHistory('redo')"
            ></button>
            <button
                type="button"
                class="action__controls-button add-on"
                :class="{ active: showNoteEntry }"
                :title="$t('openKeyboard')"
                @click="openKeyboard()"
            ></button>
            <button
                type="button"
                class="action__controls-button add-off"
                :title="$t('addNoteOff')"
                @click="addNoteOnOff()"
            ></button>
            <button
                type="button"
                class="action__controls-button remove-note"
                :title="$t('removeInstruction')"
                @click="deleteNote()"
            ></button>
            <template v-if="!jamMode">
                <button
                    type="button"
                    class="action__controls-button module-params"
                    :title="$t('editModuleParams')"
                    @click="editModuleParams()"
                ></button>
                <button
                    type="button"
                    class="action__controls-button module-glide"
                    :title="$t('glideModuleParams')"
                    @click="glideParams()"
                ></button>
            </template>
        </div>
    </section>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import ModalWindows from "@/definitions/modal-windows";
import glideParameterAutomations from "@/model/actions/event-param-glide";
import deleteEvent from "@/model/actions/event-delete";
import EventFactory from "@/model/factories/event-factory";
import { ACTION_NOTE_OFF } from "@/model/types/audio-event";

import messages from "./messages.json";

export default {
    i18n: { messages },
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            showNoteEntry: state => state.editor.showNoteEntry,
            selectedStep: state => state.editor.selectedStep,
            selectedInstrument: state => state.editor.selectedInstrument,
        }),
        ...mapGetters([
            "activeOrderIndex",
            "canUndo",
            "canRedo",
            "jamMode",
        ]),
    },
    methods: {
        ...mapMutations([
            "addEventAtPosition",
            "openModal",
            "saveState",
            "setShowNoteEntry",
        ]),
        ...mapActions([
            "undo",
            "redo"
        ]),
        openKeyboard(): void {
            this.setShowNoteEntry( !this.showNoteEntry );
        },
        addNoteOnOff():void {
            const offEvent = EventFactory.create();
            offEvent.action = ACTION_NOTE_OFF;
            this.addEventAtPosition({ event: offEvent, store: this.$store });
        },
        deleteNote(): void {
            this.saveState( deleteEvent( this.$store ));
        },
        editModuleParams(): void {
            this.openModal( ModalWindows.MODULE_PARAM_EDITOR );
        },
        glideParams(): void {
            glideParameterAutomations(
                this.activeSong, this.selectedStep, this.activeOrderIndex,
                this.selectedInstrument, this.$store,
            );
        },
        async navigateHistory( action = "undo" ): Promise<void> {
            await this.$store.dispatch( action );
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

#editorActions {
    @include inlineFlex();
    background-color: #000;
    vertical-align: top;
    position: relative;
    width: $track-editor-width;

    @include mobile() {
        position: fixed; /* keep pattern editor in static position */
        left: 0;
        height: 100%;
        z-index: 1;
    }
}

.action__controls {
    display: flex;
    flex-direction: column;

    &-button {
        width: $track-editor-width;
        height: $track-editor-width;
        margin: 0 0 1px;
        background-color: #b6b6b6;
        background-repeat: no-repeat;
        background-position: 50%;
        background-size: 50%;
        border: none;
        cursor: pointer;

        &.add-on {
            background-image: url('../../assets/icons/icon-note-add.png');
        }
        &.add-off {
            background-image: url('../../assets/icons/icon-note-mute.png');
        }
        &.remove-note {
            background-image: url('../../assets/icons/icon-note-delete.png');
        }
        &.module-params {
            background-image: url('../../assets/icons/icon-module-params.png');
        }
        &.module-glide {
            background-image: url('../../assets/icons/icon-module-glide.png');
        }
        &.undo {
            background-image: url('../../assets/icons/icon-undo.png');
        }
        &.redo {
            background-image: url('../../assets/icons/icon-redo.png');
        }

        &.active {
            background-color: $color-1;
        }

        &:hover {
            background-color: $color-5;
        }

        &.disabled {
            opacity: .25;
            @include noEvents();
        }
    }
}
</style>
