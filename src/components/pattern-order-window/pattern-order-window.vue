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
                :title="$t('help')"
                class="help-button"
                @click="openHelp()"
            >?</button>
            <button
                :title="$t('close')"
                type="button"
                class="close-button"
                @click="$emit('close')"
            >x</button>
            <span
                v-t="'patternExpl'"
                class="header__explanation"
            ></span>
        </div>
        <hr class="divider" />
        <ul class="order-list">
            <draggable v-model="entries" itemKey="index">
                <template #item="{element}">
                    <li
                        class="order-list__entry"
                        :class="{
                            'order-list__entry--active': element.index === activeOrderIndex
                        }"
                        ref="listEntry"
                    >
                        <span
                            class="order-list__entry-title"
                            role="button"
                            @click.stop="handleSelect( element )"
                        >{{ element.name }} <span class="order-list__entry-title-description">{{ element.description }}</span>
                        </span>
                        <button
                            type="button"
                            class="order-list__entry-action-button icon-play"
                            :title="$t('play')"
                            @click.stop="handlePlayClick( element )"
                        ></button>
                        <button
                            type="button"
                            class="order-list__entry-action-button"
                            :title="$t('duplicate')"
                            @click.stop="handleDuplicateClick( element )"
                        ><img src="@/assets/icons/icon-copy.svg" :alt="$t('duplicate')" /></button>
                        <button
                            v-if="canDelete"
                            type="button"
                            class="order-list__entry-action-button"
                            :title="$t('delete')"
                            @click.stop="handleDeleteClick( element )"
                        ><img src="@/assets/icons/icon-trashcan.svg" :alt="$t('delete')" /></button>
                    </li>
                </template>
            </draggable>
        </ul>
        <hr class="divider divider--bottom" />
        <div class="footer">
            <div class="footer__ui">
               <select-box
                    v-model="newPatternIndex"
                    :options="patterns"
                    auto-position
                    class="footer__ui-select-box"
                />
                <button
                    v-t="'addPattern'"
                    :title="$t('addPattern')"
                    type="button"
                    class="button"
                    @click.stop="handleAddClick()"
                ></button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Draggable from "vuedraggable";
import { mapState, mapGetters, mapMutations, type Store } from "vuex";
import SelectBox from "@/components/forms/select-box.vue";
import Actions from "@/definitions/actions";
import ManualURLs from "@/definitions/manual-urls";
import createAction from "@/model/factories/action-factory";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import PatternOrderUtil from "@/utils/pattern-order-util";
import messages from "./messages.json";

type WrappedPatternOrderEntry = {
    pattern: number; // index of pattern in pattern list
    description?: string;
    name: string;
    index: number;   // index of pattern within order list
};

export default {
    i18n: { messages },
    components: {
        Draggable,
        SelectBox,
    },
    data: () => ({
        newPatternIndex: 0,
    }),
    computed: {
        ...mapState({
            activeSong : state => state.song.activeSong,
        }),
        ...mapGetters([
            "activeOrderIndex",
            "isPlaying",
        ]),
        entries: {
            get(): WrappedPatternOrderEntry[] {
                const { patterns } = this.activeSong;
                return this.activeSong.order
                    .map(( pattern: number, index: number ) => ({
                        pattern,
                        index,
                        name: patterns[ pattern ].name,
                        description: patterns[ pattern ].description,
                    }));
            },
            set( value: WrappedPatternOrderEntry[] ): void {
                const order = value.map( entry => entry.pattern );
                createAction( Actions.UPDATE_PATTERN_ORDER, { store: this.$store, order });
            }
        },
        patterns(): { label: string, value: number }[] {
            return this.activeSong.patterns
                .map(( pattern: EffluxPatternOrder, index: number ) => ({
                    label: `${pattern.name} ${pattern.description ?? ""}`,
                    value: index,
                }));
        },
        canDelete(): boolean {
            return this.entries.length > 1;
        },
    },
    async mounted(): Promise<void> {
        await this.$nextTick();
        this.$refs.listEntry?.[ this.activeOrderIndex ]?.scrollIntoView?.({ block: "center" });
    },
    methods: {
        ...mapMutations([
            "gotoPattern",
            "setPlaying",
            "setLooping",
        ]),
        openHelp(): void {
            window.open( ManualURLs.PATTERN_ORDER, "_blank" );
        },
        handleSelect( entry: WrappedPatternOrderEntry ): void {
            this.gotoPattern({ orderIndex: entry.index, song: this.activeSong });
        },
        handlePlayClick( entry: WrappedPatternOrderEntry ): void {
            this.handleSelect( entry );
            // this.setLooping( true );
            if ( !this.isPlaying ) {
                this.setPlaying( true );
            }
        },
        handleDuplicateClick( entry: WrappedPatternOrderEntry ): void {
            const newOrder = [ ...this.activeSong.order ];
            const tail = newOrder.splice( entry.index + 1 );
            createAction( Actions.UPDATE_PATTERN_ORDER, { store: this.$store, order: [ ...newOrder, entry.pattern, ...tail ] });
        },
        handleDeleteClick( entry: WrappedPatternOrderEntry ): void {
            createAction( Actions.UPDATE_PATTERN_ORDER, {
                store: this.$store,
                order: PatternOrderUtil.removePatternAtIndex( this.activeSong.order, entry.index )
            });
        },
        handleAddClick(): void {
            const order = [ ...this.activeSong.order, this.newPatternIndex ];
            createAction( Actions.UPDATE_PATTERN_ORDER, { store: this.$store, order });
        },
    },
};
</script>

<style lang="scss" scoped>
@use "sass:math";

@use "@/styles/_colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";
@use "@/styles/typography";
@use "@/styles/transporter";

$width: 450px;
$height: 500px;
$headerFooterHeight: 134px;

.pattern-order-window {
    @include mixins.editorComponent();
    @include mixins.overlay();
    @include mixins.noSelect();
    overflow: hidden;
    padding: 0;

    .header,
    .footer {
        padding: variables.$spacing-small variables.$spacing-large 0;
    }

    .header {
        &__explanation {
            display: block;
            padding: variables.$spacing-small 0 0;
        }
    }

    .footer {
        &__ui {
            display: flex;
            justify-content: space-evenly;

            .button {
                flex: 0.2;
            }

            &-select-box {
                flex: 0.7;
            }
        }
    }

    .divider {
        width: calc(100% + #{variables.$spacing-large * 2});
        margin-left: -( variables.$spacing-large );
        margin-bottom: 0;
    }

    @include mixins.componentIdeal( $width, $height ) {
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

    @include mixins.componentFallback( $width, $height ) {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
        z-index: variables.$z-window;

        .order-list {
            height: calc(100% - #{$headerFooterHeight});
        }
    }
}


.order-list {
    @include mixins.list();
    width: 100%;
    overflow-y: auto;

    &__entry {
        @include typography.titleFont();
        @include mixins.boxSize();
        cursor: grab;
        display: flex;
        align-items: center;
        width: 100%;
        padding: variables.$spacing-small variables.$spacing-large;
        background-color: colors.$color-pattern-even;

        &-title {
            flex: 1;
            cursor: pointer;
            @include mixins.truncate();
            vertical-align: middle;

            &-description {
                font-style: italic;
            }
        }

        &-action-button {
            width: #{variables.$spacing-large + variables.$spacing-xsmall};
            @include mixins.ghostButton();

            &:hover {
                filter: brightness(0) invert(1) !important;
            }

            &.icon-play {
                margin-right: variables.$spacing-small;
            }
        }

        &:nth-child(even) {
            background-color: colors.$color-pattern-odd;
            /*color: #FFF;*/
        }

        &:hover {
            background-color: colors.$color-3;
            color: #000;

            .order-list__entry-action-button {
                filter: brightness(0);
            }
        }

        &--active {
            background-color: colors.$color-5 !important;
            color: #fff;

            .order-list__entry-action-button {
                filter: brightness(0);
            }
        }
    }
}
</style>
