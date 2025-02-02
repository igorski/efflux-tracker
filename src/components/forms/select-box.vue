/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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
    <div class="select-box-wrapper">
        <vue-select
            :options="options"
            :searchable="searchable"
            :disabled="disabled"
            :clearable="false"
            :append-to-body="autoPosition"
            :calculate-position="withPopper"
            v-model="internalValue"
            class="select"
            :class="{ 'select--narrow': narrow }"
            ref="select"
        />
    </div>
</template>

<script lang="ts">
import VueSelect from "vue-select";
import "vue-select/dist/vue-select.css";
import { createPopper } from '@popperjs/core'

export default {
    emits: ["input"],
    props: {
        value: {
            type: [ String, Number ],
            default: null,
        },
        options: {
            type: Array,
            default: () => ([]),
        },
        searchable: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        autoPosition: {
            type: Boolean,
            default: false,
        },
        narrow: {
            type: Boolean,
            default: false,
        },
    },
    components: {
        VueSelect,
    },
    computed: {
        internalValue: {
            get(): string | number {
                return this.options.find(({ value }) => value === this.value );
            },
            set({ value }: { value: string | number }): void {
                this.$emit( "input", value );
                this.assertSync();
            }
        },
    },
    methods: {
        /**
         * Extreme hackaroni. Sometimes upon selection the select box will not
         * show the currently selected value (the value has been updated in
         * the v-model just fine). Here we do a quick open/close (invisible to
         * the eye) to ensure all looks OK.
         */
        async assertSync(): Promise<void> {
            await this.$nextTick();
            const select = this.$refs.select;
            if ( typeof select?.closeSearchOptions === "function" ) {
                select.open = true;
                window.requestAnimationFrame(() => {
                    select.closeSearchOptions();
                });
            }
        },
        withPopper( dropdownList, component, { width }): () => void {
            dropdownList.style.width = width;

            const popper = createPopper( component.$refs.toggle, dropdownList, {
                placement: "top",
                modifiers: [{
                    name: "offset",
                    options: {
                       offset: [ 0, -1 ],
                    },
                },
                {
                    name: "toggleClass",
                    enabled: true,
                    phase: "write",
                    fn({ state }) {
                        component.$el.classList.toggle( "drop-up", state.placement === "top" );
                    },
                }],
            });
            return (): void => {
                popper.destroy();
            }
        },
    }
};
</script>

<style lang="scss">
@import "@/styles/_mixins";

.select-box-wrapper {
    display: inline-block;
    @include toolFont();
}

.vs__dropdown-toggle {
    border-radius: $spacing-small;
    background-color: $color-1;
}
.vs--disabled {
    .vs__dropdown-toggle {
        background-color: #222;
    }
    input,
    .vs__actions {
        display: none;
    }
}
.vs__open-indicator {
    fill: #222;
}
.vs--unsearchable .vs__search {
    // fixes weird vertical jump after selectbox open
    // by keeping it in the DOM, focus/blur/esc still work
    position: absolute;
    top: -9999px;
}
.vs__selected {
    margin: #{$spacing-xsmall + 1} $spacing-xsmall 0;
    font-size: 95%;
    @include truncate();
}

.vs__selected-options {
    height: 24px;
    @include truncate();
}

.vs__dropdown-menu {
    overflow-x: hidden;

    li {
        @include truncate();
        padding-left: $spacing-small;
        padding-right: $spacing-small;
    }
}

.select--narrow {
    .vs__dropdown-toggle {
        padding: 0;
    }

    .vs__selected-options {
        height: 22px;
    }

    .vs__selected {
        margin: $spacing-xxsmall $spacing-medium $spacing-xsmall;
        padding: 0;
    }

    .vs__open-indicator {
        transform: scale(0.8);
    }
}
</style>
