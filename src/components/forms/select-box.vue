/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
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
        <vue-select :options="options"
                    :searchable="searchable"
                    :disabled="disabled"
                    :clearable="false"
                    v-model="internalValue"
                    class="select"
                    ref="select"
        />
    </div>
</template>

<script>
import VueSelect from "vue-select";
import "vue-select/dist/vue-select.css";

export default {
    props: {
        value: {
            type: String,
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
    },
    components: {
        VueSelect,
    },
    computed: {
        internalValue: {
            get() {
                return this.options.find(({ value }) => value === this.value );
            },
            set({ value }) {
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
        async assertSync() {
            await this.$nextTick();
            const select = this.$refs.select;
            if ( typeof select?.closeSearchOptions === "function" ) {
                select.open = true;
                window.requestAnimationFrame(() => {
                    select.closeSearchOptions();
                });
            }
        }
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
.vs__selected {
    margin: #{$spacing-xsmall + 1} $spacing-xsmall 0;
    font-size: 95%;
}

.vs__selected-options {
    height: 24px;
    @include truncate();
}
</style>
