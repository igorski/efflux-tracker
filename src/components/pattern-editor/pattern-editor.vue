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
            {{ activePattern.name }}
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
                    :disabled="!canDelete"
                    type="button"
                    @click="handlePatternDelete()"
                ></button>
            </li>
            <li
                v-if="!useOrders"
                class="list-item"
            >
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
import addPattern from "@/model/actions/pattern-add";
import clearPattern from "@/model/actions/pattern-clear";
import deletePattern from "@/model/actions/pattern-delete";
import pastePattern from "@/model/actions/pattern-paste";
import { EffluxPattern } from "@/model/types/pattern";
import Config from "@/config";
import ModalWindows from "@/definitions/modal-windows";
import { clone } from "@/utils/object-util";
import SelectBox from "@/components/forms/select-box.vue";
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
            "activePatternIndex",
            "useOrders",
        ]),
        activePattern(): EffluxPattern {
            return this.activeSong.patterns[ this.activePatternIndex ];
        },
        patternStep: {
            get(): string {
                return this.activePattern.steps.toString();
            },
            set( value: string ): void {
                this.setPatternSteps({ pattern: this.activePattern, steps: parseFloat( value ) });
            }
        },
        patternStepOptions(): { label: string, value: string }[] {
            return [ 16, 32, 64, 128 ].map( amount => ({
                label: this.$t( "steps", { amount }), value: amount.toString()
            }));
        },
        canDelete(): boolean {
            return this.activeSong.patterns.length > 1;
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
            this.saveState( clearPattern( this.$store ));
        },
        handlePatternCopy(): void {
            this.patternCopy = clone( this.activePattern );
        },
        handlePatternPaste(): void {
            if ( this.patternCopy ) {
                this.clearSelection();
                this.saveState( pastePattern( this.$store, this.patternCopy ));
            }
        },
        handlePatternAdd(): void {
            const patterns = this.activeSong.patterns;
            if ( patterns.length === Config.MAX_PATTERN_AMOUNT ) {
                this.showError( this.$t( "errorMaxExceeded", { amount: Config.MAX_PATTERN_AMOUNT }));
                return;
            }
            this.saveState( addPattern( this.$store ));
            this.gotoNextPattern( this.activeSong );
        },
        handlePatternDelete(): void {
            const patterns = this.activeSong.patterns;
            if ( patterns.length === 1 ) {
                this.handlePatternClear();
            } else {
                this.saveState( deletePattern( this.$store ));
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
@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/forms";
@use "@/styles/typography";

.pattern-editor {
    display: inline;
    margin: 0;
    padding-left: variables.$spacing-small;

    &__title {
        padding: 0 variables.$spacing-small;
        @include typography.toolFont();
    }

    &__pattern-name {
        @include typography.toolFont();
        margin-right: variables.$spacing-small;
        color: #fff;
    }

    h4 {
        display: inline;
    }

    .inline-list {
        @include mixins.list();
        display: inline;

        .list-item {
            display: inline;
            cursor: pointer;

            @include mixins.large() {
                vertical-align: middle;
            }
        }

        button {
            margin: 0 0 0 variables.$spacing-xsmall;
            background-color: #333;
            color: #b6b6b6;
            border-radius: 0;
            border: 0;
            @include typography.toolFont();

            &:hover {
                color: #fff;
            }

            &:disabled {
                color: #666;
            }
        }
    }
}

.pattern-step-select {
    width: 85px;
    margin: 0 variables.$spacing-xxsmall 0 variables.$spacing-small;
}

.pattern-manager-button {
    margin-left: variables.$spacing-medium !important;
    color: #FFF !important;

    &:hover {
        color: colors.$color-1 !important;
    }
}

/* large views and above */

@media screen and ( min-width: variables.$ideal-pattern-editor-width ) {
    .pattern-editor {
        margin: 0 0 0 variables.$spacing-medium;

        h2 {
            padding: 0 variables.$spacing-medium 0 0;
        }
    }
}

@include mixins.mobile() {
    .pattern-editor  {
        display: none; /* only visible when settings mode is active */

        &.settings-mode {
            display: flex;
            flex-direction: column;
            padding: 0 variables.$spacing-medium;

            .inline-list button {
                margin: 0 variables.$spacing-xsmall variables.$spacing-small 0;
            }
        }
    }

    .pattern-editor {
        h2, .pattern-editor__pattern-name {
            display: none;
        }
        .inline-list {
            margin: 0;

            .list-item {
                display: inline-block;
                margin-bottom: variables.$spacing-small;
            }
        }
    }
}
</style>
