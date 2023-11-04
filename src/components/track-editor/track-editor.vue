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
        id="trackEditor"
        ref="container"
    >
        <ul class="controls">
            <li
                class="undo"
                :class="{ disabled: !canUndo }"
                @click="navigateHistory('undo')"
            ></li>
            <li
                class="redo"
                :class="{ disabled: !canRedo }"
                @click="navigateHistory('redo')"
            ></li>
            <li
                class="add-on"
                :class="{ active: showNoteEntry }"
                @click="addNoteOn"
            ></li>
            <li
                class="add-off"
                @click="addNoteOnOff"
            ></li>
            <li
                class="remove-note"
                @click="deleteNote"
            ></li>
            <template v-if="!jamMode">
                <li
                    class="module-params"
                    @click="editModuleParams"
                ></li>
                <li
                    class="module-glide"
                    @click="glideParams"
                ></li>
            </template>
        </ul>
    </section>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from "vuex";
import Actions       from "@/definitions/actions";
import ModalWindows        from "@/definitions/modal-windows";
import EventFactory        from "@/model/factories/event-factory";
import createAction        from "@/model/factories/action-factory";
import { ACTION_NOTE_OFF } from "@/model/types/audio-event";
import EventUtil           from "@/utils/event-util";

export default {
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
        addNoteOn() {
            this.setShowNoteEntry( !this.showNoteEntry );
        },
        addNoteOnOff(){
            const offEvent = EventFactory.create();
            offEvent.action = ACTION_NOTE_OFF;
            this.addEventAtPosition({ event: offEvent, store: this.$store });
        },
        deleteNote() {
            this.saveState(createAction(Actions.DELETE_EVENT, { store: this.$store }));
        },
        editModuleParams() {
            this.openModal( ModalWindows.MODULE_PARAM_EDITOR );
        },
        glideParams() {
            EventUtil.glideParameterAutomations(
                this.activeSong, this.selectedStep, this.activeOrderIndex,
                this.selectedInstrument, this.$store,
            );
        },
        async navigateHistory( action = "undo" ) {
            await this.$store.dispatch( action );
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";

#trackEditor {
    @include inlineFlex();
    background-color: #000;
    vertical-align: top;
    position: relative;
    min-width: 40px;

    @include mobile() {
        position: fixed; /* keep pattern editor in static position */
        left: 0;
        height: 100%;
        z-index: 10;
    }

    .controls {
        @include list();

        li {
            width: 40px;
            height: 40px;
            margin: 0 0 1px;
            background-color: #b6b6b6;
            background-repeat: no-repeat;
            background-position: 50%;
            background-size: 50%;
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

    &.fixed {
        .controls {
            position: fixed;
            top: $menu-height;
        }
    }
}
</style>
