/**
* The MIT License (MIT)
*
* Igor Zinken 2023 - https://www.igorski.nl
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
    <div class="pattern-order-window">
        <div class="header">
            <h2 v-t="'patternOrder'"></h2>
            <button
                type="button"
                class="close-button"
                @click="$emit('close')"
            >x</button>
        </div>
        <hr class="divider" />
        <ul class="order-list">
            <draggable v-model="entries">
                <li
                    v-for="(entry, index) in entries"
                    :key="`entry_${index}`"
                    class="order-list__entry"
                >
                    <span class="title">{{ entry }}</span>
                    <button
                        type="button"
                        class="action-button icon-play"
                        :title="$t('play')"
                        @click.stop="handlePlayClick()"
                    ></button>
                    <button
                        type="button"
                        class="action-button"
                        :title="$t('duplicate')"
                        @click.stop="handleDuplicateClick()"
                    ><img src="@/assets/icons/icon-download.svg" :alt="$t('duplicate')" /></button>
                    <button
                        type="button"
                        class="action-button"
                        :title="$t('delete')"
                        @click.stop="handleDeleteClick()"
                    ><img src="@/assets/icons/icon-trashcan.svg" :alt="$t('delete')" /></button>
                </li>
            </draggable>
        </ul>
        <hr class="divider divider--bottom" />
        <div class="footer">
            <button
                v-t="'createNew'"
                type="button"
                class="button"
                @click="handleCreateNew()"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import Draggable from "vuedraggable";
import { mapState, type Store } from "vuex";
import { enqueueState } from "@/model/factories/history-state-factory";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import type { EffluxState } from "@/store";
import messages from "./messages.json";

export default {
    i18n: { messages },
    components: {
        Draggable,
    },
    computed: {
        ...mapState({
            activeSong : state => state.song.activeSong,
            activeOrderIndex: state => state.sequencer.activeOrderIndex,
        }),
        entries: {
            get(): EffluxPatternOrder {
                return this.activeSong.order;
            },
            set( value: EffluxPatternOrder ): void {
                const store: Store<EffluxState> = this.$store;
                const existingValue = [ ...this.activeSong.order ];

                const commit = (): void => store.commit( "replacePatternOrder", value );
                commit();

                enqueueState( "songOrderShuffle", {
                    undo(): void {
                        store.commit( "replacePatternOrder", existingValue );
                    },
                    redo(): void {
                        commit();
                    },
                });
            }
        },
    },
    methods: {
        handleCreateNew(): void {
            console.info( "CREATE NEW!" );
        },
        handlePlayClick(): void {
            console.info( "PLAY! PLAY!" );
        },
        handleDuplicateClick(): void {
            console.info( "DUPLICATE!" );
        },
        handleDeleteClick(): void {
            console.info( "DELETE!" );
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@import "@/styles/_mixins";
@import "@/styles/typography";
@import "@/styles/transporter";

$width: 750px;
$height: 500px;
$headerFooterHeight: 104px;

.pattern-order-window {
    @include editorComponent();
    @include overlay();
    @include noSelect();
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;

    .header,
    .footer {
        padding: $spacing-small $spacing-large 0;
    }

    .divider {
        width: calc(100% + #{$spacing-large * 2});
        margin-left: -$spacing-large;
        margin-bottom: 0;
    }

    @include componentIdeal( $width, $height ) {
        width: $width;
        height: $height;
        top: 50%;
        left: 50%;
        margin-left: math.div( -$width, 2 );
        margin-top: math.div( -$height, 2 );

        .order-list {
            height: calc(#{$height - $headerFooterHeight});
        }
    }

    @include componentFallback( $width, $height ) {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
        z-index: 2000;

        .order-list {
            height: calc(100% - #{$headerFooterHeight});
        }
    }
}


.order-list {
    @include list();
    width: 100%;
    overflow-y: auto;

    &__entry {
        @include titleFont();
        @include boxSize();
        cursor: grab;
        display: flex;
        align-items: center;
        width: 100%;
        padding: $spacing-small $spacing-large;
        background-color: $color-pattern-even;

        .title, .action-button {
            display: inline-block;
        }

        .title {
            flex: 1;
            @include noEvents();
            @include truncate();
            vertical-align: middle;
        }

        .action-button {
            width: #{$spacing-large + $spacing-xsmall};
            @include ghostButton();

            &:hover {
                filter: brightness(0) invert(1) !important;
            }

            &.icon-play {
                margin-right: $spacing-small;
            }
        }

        @include mobile() {
            .title {
                width: 95%;
            }
        }

        &:nth-child(even) {
            background-color: $color-pattern-odd;
            /*color: #FFF;*/
        }

        &:hover {
            background-color: $color-5;
            color: #000;

            .action-button {
                filter: brightness(0);
            }
        }
    }
}
</style>
