/**
* The MIT License (MIT)
*
* Igor Zinken 2016-2023 - https://www.igorski.nl
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
        class="pattern-editor"
        :class="{ 'settings-mode': mobileMode === 'settings' }"
        @mouseover="setHelpTopic('pattern')"
    >
        <h2
            v-t="'title'"
            class="pattern-editor__title"
        ></h2>
        <span class="pattern-editor__pattern-name">
            {{ patternName }}
        </span>
        <ul class="inline-list">
            <li class="list-item">
                <select-box
                    v-model.number="patternStep"
                    :options="patternStepOptions"
                    class="pattern-step-select"
                />
            </li>
            <li class="list-item">
                <button
                    v-t="'patternManager'"
                    type="button"
                    class="pattern-manager-button"
                    @click="handlePatternManagerClick()"
                ></button>
            </li>
            <li class="list-item">
                <button
                    v-t="'clear'"
                    type="button"
                    @click="handlePatternClear()"
                ></button>
            </li>
            <li class="list-item">
                <button
                    v-t="'copy'"
                    type="button"
                    @click="handlePatternCopy()"
                ></button>
            </li>
            <li class="list-item">
                <button
                    v-t="'paste'"
                    type="button"
                    @click="handlePatternPaste()"
                ></button>
            </li>
            <li class="list-item">
                <button
                    v-t="'add'"
                    type="button"
                    @click="handlePatternAdd()"
                ></button>
            </li>
            <li class="list-item">
                <button
                    v-t="'delete'"
                    type="button"
                    @click="handlePatternDelete()"
                ></button>
            </li>
            <li class="list-item">
                <button
                    v-t="'advanced'"
                    type="button"
                    @click="handlePatternAdvanced()"
                ></button>
            </li>
        </ul>
    </section>
</template>

<script lang="ts">
import { mapState, mapGetters, mapMutations } from "vuex";
import createAction from "@/model/factories/action-factory";
import Config from "@/config";
import Actions from "@/definitions/actions";
import ModalWindows from "@/definitions/modal-windows";
import { clone } from "@/utils/object-util";
import SelectBox from "@/components/forms/select-box.vue";
import { indexToName } from "@/utils/pattern-name-util";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        SelectBox,
    },
    data: () => ({
        patternCopy: null
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            mobileMode: state => state.mobileMode
        }),
        ...mapGetters([
            "activePattern",
            "amountOfSteps",
        ]),
        patternStep: {
            get(): string {
                return this.activeSong.patterns[ this.activePattern ].steps.toString();
            },
            set( value: string ): void {
                const pattern = this.activeSong.patterns[ this.activePattern ];
                this.setPatternSteps({ pattern, steps: parseFloat( value ) });
            }
        },
        patternStepOptions(): { label: string, value: string }[] {
            return [ 16, 32, 64, 128 ].map( amount => ({
                label: this.$t( "steps", { amount }), value: amount.toString()
            }));
        },
        patternName(): string {
            return indexToName( this.activePattern );
        },
    },
    methods: {
        ...mapMutations([
            "setHelpTopic",
            "saveState",
            "clearSelection",
            "setPatternSteps",
            "gotoNextPattern",
            "openModal",
            "showError",
        ]),
        handlePatternClear(): void {
            this.clearSelection();
            this.saveState( createAction( Actions.CLEAR_PATTERN, { store: this.$store }));
        },
        handlePatternCopy(): void {
            this.patternCopy = clone( this.activeSong.patterns[ this.activePattern ]);
        },
        handlePatternPaste(): void {
            if ( this.patternCopy ) {
                this.clearSelection();
                this.saveState(
                    createAction(
                        Actions.PASTE_PATTERN,
                        { store: this.$store, patternCopy: this.patternCopy }
                    )
                );
            }
        },
        handlePatternAdd(): void {
            const patterns = this.activeSong.patterns;
            if ( patterns.length === Config.MAX_PATTERN_AMOUNT ) {
                this.showError( this.$t( "errorMaxExceeded", { amount: Config.MAX_PATTERN_AMOUNT }));
                return;
            }
            this.saveState( createAction( Actions.ADD_PATTERN, { store: this.$store }));
            this.gotoNextPattern( this.activeSong );
        },
        handlePatternDelete(): void {
            const patterns = this.activeSong.patterns;
            if ( patterns.length === 1 ) {
                this.handlePatternClear();
            }
            else {
                this.saveState( createAction( Actions.DELETE_PATTERN, { store: this.$store }));
            }
        },
        handlePatternAdvanced(): void {
            this.openModal( ModalWindows.ADVANCED_PATTERN_EDITOR );
        },
        handlePatternManagerClick(): void {
            this.openModal( ModalWindows.PATTERN_MANAGER );
        },
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/_mixins";
@import "@/styles/forms";

.pattern-editor {
    display: inline;
    margin: 0;
    padding-left: $spacing-small;

    &__title {
        padding: 0 $spacing-small;
        @include toolFont();
    }

    &__pattern-name {
        @include toolFont();
        margin-right: $spacing-small;
        color: #fff;
    }

    h4 {
        display: inline;
    }

    .inline-list {
        @include list();
        display: inline;

        .list-item {
            display: inline;
            cursor: pointer;

            @include large() {
                vertical-align: middle;
            }
        }

        button {
            margin: 0 0 0 $spacing-xsmall;
            background-color: #333;
            color: #b6b6b6;
            border-radius: 0;
            border: 0;
            @include toolFont();

            &:hover {
                color: #fff;
            }
        }
    }
}

.pattern-step-select {
    width: 85px;
    margin: 0 $spacing-xxsmall 0 $spacing-small;
}

.pattern-manager-button {
    margin-left: $spacing-medium !important;
    color: #FFF !important;

    &:hover {
        color: $color-1 !important;
    }
}

/* large views and above */

@media screen and ( min-width: $ideal-pattern-editor-width ) {
    .pattern-editor {
        margin: 0 0 0 $spacing-medium;

        h2 {
            padding: 0 $spacing-medium 0 0;
        }
    }
}

@include mobile() {
    .pattern-editor  {
        display: none; /* only visible when settings mode is active */

        &.settings-mode {
            display: inline;

            .inline-list button {
                margin: 0 $spacing-xsmall $spacing-small 0;
            }
        }
    }

    .pattern-editor {
        h2 {
            display: none;
        }
        .inline-list {
            margin: 0;

            .list-item {
                display: inline-block;
                margin-bottom: $spacing-small;
            }
        }
    }
}
</style>
