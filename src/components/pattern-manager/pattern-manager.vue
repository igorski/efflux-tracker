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
    <div class="pattern-manager">
        <div class="header">
            <h2 v-t="'patternManager'"></h2>
            <button
                :title="$t('help')"
                type="button"
                class="help-button"
                @click="openHelp()"
            >?</button>
            <button
                :title="$t('close')"
                type="button"
                class="close-button"
                @click="$emit('close')"
            >x</button>
        </div>
        <hr class="divider" />
        <ul class="pattern-list">
            <li
                v-for="entry in entries"
                :key="`entry_${entry.name}_${entry.index}`"
                class="pattern-list__entry"
                :class="{
                    'pattern-list__entry--active': entry.index === activePatternIndex
                }"
                ref="listEntry"
                role="button"
                @click.stop="handleSelect( entry )"
            >
                <span
                    class="pattern-list__entry-title"
                >{{ entry.name }}</span>
                <input
                    v-if="showDescriptionInput === entry.index"
                    ref="descrInput"
                    :value="entry.description"
                    @blur="handleDescriptionInputBlur( entry )"
                    @keyup.enter="handleDescriptionInputBlur( entry )"
                    class="pattern-list__entry-description"
                />
                <span
                    v-else
                    class="pattern-list__entry-description"
                >{{ entry.description }}</span>
                <span
                    class="pattern-list__entry-steps"
                >{{ $t( "stepAmount", { amount: entry.pattern.steps }) }}</span>
                <div class="pattern-list__entry-action-buttons">
                    <button
                        type="button"
                        class="pattern-list__entry-action-button pattern-list__entry-action-button--dark"
                        :title="$t('edit')"
                        @click.stop="handleDescriptionInputShow( entry )"
                    ><img src="@/assets/icons/icon-pencil.svg" :alt="$t('edit')" /></button>
                    <button
                        type="button"
                        class="pattern-list__entry-action-button"
                        :title="$t('duplicate')"
                        @click.stop="handleDuplicateClick( entry )"
                    ><img src="@/assets/icons/icon-copy.svg" :alt="$t('duplicate')" /></button>
                    <button
                        v-if="canDelete"
                        type="button"
                        class="pattern-list__entry-action-button"
                        :title="$t('delete')"
                        @click.stop="handleDeleteClick( entry )"
                    ><img src="@/assets/icons/icon-trashcan.svg" :alt="$t('delete')" /></button>
                </div>
            </li>
        </ul>
        <hr class="divider divider--bottom" />
        <div class="footer">
            <button
                v-t="'createNew'"
                type="button"
                class="button"
                @click="handleCreateNew()"
            ></button>
            <button
                v-if="useOrders"
                v-t="'orderPatterns'"
                type="button"
                class="button"
                @click="handleOrderClick()"
            ></button>
        </div>
    </div>
</template>

<script lang="ts">
import Draggable from "vuedraggable";
import { mapState, mapGetters, mapMutations, mapActions, type Store } from "vuex";
import ManualURLs from "@/definitions/manual-urls";
import ModalWindows from "@/definitions/modal-windows";
import addPattern from "@/model/actions/pattern-add";
import deletePattern from "@/model/actions/pattern-delete";
import type { EffluxPattern } from "@/model/types/pattern";
import messages from "./messages.json";

type WrappedPatternEntry = {
    pattern: EffluxPattern;
    description: string;
    index: number;  // index within the Songs pattern list
    name: string;   // name of pattern (derived from its pattern list index)
};

export default {
    i18n: { messages },
    components: {
        Draggable,
    },
    data: () => ({
        showDescriptionInput: -1,
    }),
    computed: {
        ...mapState({
            activeSong : state => state.song.activeSong,
        }),
        ...mapGetters([
            "activePatternIndex",
            "isPlaying",
            "useOrders",
        ]),
        entries(): WrappedPatternEntry[] {
            return this.activeSong.patterns
                .map(( pattern: EffluxPattern, index: number ) => ({
                    pattern,
                    description: pattern.description ?? this.$t( "untitled" ),
                    index,
                    name: pattern.name!,
                }));
        },
        canDelete(): boolean {
            return this.entries.length > 1;
        },
    },
    async mounted(): Promise<void> {
        await this.$nextTick();
        this.$refs.listEntry?.[ this.activePatternIndex ]?.scrollIntoView?.({ block: "center" });
    },
    methods: {
        ...mapMutations([
            "openModal",
            "replacePattern",
            "saveState",
            "setActiveOrderIndex",
            "setActivePatternIndex",
            "suspendKeyboardService",
        ]),
        ...mapActions([
            "pastePatternsIntoSong",
        ]),
        openHelp(): void {
            window.open( ManualURLs.PATTERN_MANAGER, "_blank" );
        },
        handleCreateNew(): void {
            this.saveState( addPattern( this.$store, true ));
        },
        handleOrderClick(): void {
            this.openModal( ModalWindows.PATTERN_ORDER_WINDOW );
        },
        handleSelect( entry: WrappedPatternEntry ): void {
            this.setActivePatternIndex( entry.index );
            this.setActiveOrderIndex( this.activeSong.order.indexOf( entry.index ));
        },
        handleDuplicateClick( entry: WrappedPatternEntry ): void {
            // note we insert at the end (to not upset order indices)
            this.pastePatternsIntoSong({ patterns: [ entry.pattern ], insertIndex: this.entries.length });
        },
        handleDeleteClick( entry: WrappedPatternEntry ): void {
            this.saveState( deletePattern( this.$store, entry.index ));
        },
        async handleDescriptionInputShow( entry: WrappedPatternEntry ): Promise<void> {
            this.showDescriptionInput = entry.index;
            this.suspendKeyboardService( true );
            await this.$nextTick();
            if ( !entry.pattern.description ) {
                this.$refs.descrInput[ 0 ].value = "";
            }
            this.$refs.descrInput[ 0 ]?.focus();
        },
        handleDescriptionInputBlur( entry: WrappedPatternEntry ): void {
            const description = this.$refs.descrInput[ 0 ].value;
            this.showDescriptionInput = -1;
            this.suspendKeyboardService( false );
            if ( description ) {
                this.replacePattern({ patternIndex: entry.index, pattern: { ...entry.pattern, description } });
            }
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

.pattern-manager {
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

        .pattern-list {
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
        z-index: $z-window;

        .pattern-list {
            height: calc(100% - #{$headerFooterHeight});
        }
    }
}


.pattern-list {
    @include list();
    width: 100%;
    overflow-y: auto;

    &__entry {
        @include titleFont();
        @include boxSize();
        cursor: pointer;
        display: flex;
        align-items: center;
        width: 100%;
        padding: $spacing-small $spacing-large;
        background-color: $color-pattern-even;

        &-title {
            width: 40px;
            cursor: pointer;
            @include truncate();
            vertical-align: middle;
        }

        &-description {
            width: calc(100% - 190px);
            @include truncate();
            font-style: italic;
        }

        &-steps {
            width: 80px;
        }

        &-action-buttons {
            width: 110px;
        }

        &-action-button {
            width: #{$spacing-large + $spacing-xsmall};
            @include ghostButton();

            &:hover {
                filter: brightness(0) invert(1) !important;
            }

            &.icon-play {
                margin-right: $spacing-small;
            }

            &--dark {
                filter: invert(80%) sepia(7%) saturate(146%) hue-rotate(175deg) brightness(93%) contrast(92%);
            }
        }

        &:nth-child(even) {
            background-color: $color-pattern-odd;
            /*color: #FFF;*/
        }

        &:hover {
            background-color: $color-3;
            color: #000;

            .pattern-list__entry-action-button {
                filter: brightness(0);
            }
        }

        &--active {
            background-color: $color-5 !important;
            color: #fff;

            .pattern-list__entry-action-button {
                filter: brightness(0);
            }
        }
    }
}
</style>
