<template>
    <section id="patternEditor"
             @mouseover="setHelpTopic('pattern')">
        <h2>Pattern</h2>
        <ul>
            <li>
                <button type="button" id="patternClear"
                        @click="handlePatternClear">clear</button>
            </li>
            <li>
                <button type="button" id="patternCopy"
                        @click="handlePatternCopy">copy</button>
            </li>
            <li>
                <button type="button" id="patternPaste"
                        @click="handlePatternPaste">paste</button>
            </li>
            <li>
                <button type="button" id="patternAdd"
                        @click="handlePatternAdd">add</button>
            </li>
            <li>
                <button type="button" id="patternDelete"
                        @click="handlePatternDelete">delete</button>
            </li>
            <li>
                <select id="patternSteps"
                        v-model="patternStep"
                >
                    <option value="16">16 steps</option>
                    <option value="32">32 steps</option>
                    <option value="64">64 steps</option>
                    <option value="128">128 steps</option>
                </select>
            </li>
            <li>
                <button type="button" id="patternAdvanced"
                        @click="handlePatternAdvanced">advanced</button>
            </li>
        </ul>
    </section>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';

export default {
    data: () => ({
        patternCopy: null
    }),
    computed: {
        ...mapState({
            activeSong: state => state.song.activeSong,
            activePattern: state => state.sequencer.activePattern,
        }),
        ...mapGetters([
            'amountOfSteps',
        ]),
        patternStep: {
            get() {
                return this.activeSong.patterns[this.activePattern].steps;
            },
            set(value) {
                const pattern = this.activeSong.patterns[this.activePattern];

                // update model values
                this.setPatternSteps({ pattern, steps: value });

               Pubsub.publish( Messages.PATTERN_STEPS_UPDATED, value );
            }
        }
    },
    methods: {
        ...mapMutations([
            'setHelpTopic',
            'clearSelection',
            'setPatternSteps',
            'setOverlay',
        ]),
        handlePatternClear() {
            efflux.activeSong.patterns[ this.activePattern ] = PatternFactory.createEmptyPattern(this.amountOfSteps);
            this.clearSelection();
            Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
            Pubsub.publishSync( Messages.CREATE_LINKED_LISTS );
        },
        handlePatternCopy() {
            this.patternCopy = ObjectUtil.clone( this.activeSong.patterns[ this.activePattern ] );
        },
        handlePatternPaste() {
            if ( this.patternCopy ) {
                PatternFactory.mergePatterns( this.activeSong.patterns[ this.activePattern ], this.patternCopy, this.activePattern );
                Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
                Pubsub.publishSync( Messages.CREATE_LINKED_LISTS );
            }
        },
        handlePatternAdd() {
            const song     = efflux.activeSong,
                  patterns = song.patterns;
        
            if ( patterns.length === Config.MAX_PATTERN_AMOUNT ) {
                Pubsub.publish( Messages.SHOW_ERROR, getCopy( "ERROR_MAX_PATTERNS", Config.MAX_PATTERN_AMOUNT ));
                return;
            }
            song.patterns = PatternUtil.addEmptyPatternAtIndex( patterns, this.activePattern + 1, this.amountOfSteps );
        
            Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );

            this.setActivePattern(this.activePattern + 1);
        },
        handlePatternDelete() {
            const patterns = this.activeSong.patterns;
        
            if ( patterns.length === 1 ) {
                handlePatternClear( aEvent );
            }
            else {
                this.activeSong.patterns = PatternUtil.removePatternAtIndex(patterns, this.activePattern);
        
                if ( this.activePattern > 0 )
                    this.setActivePattern(this.activePattern - 1);
                else
                    Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
        
                Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );
            }
        },
        handlePatternAdvanced() {
            this.setOverlay('ape');
        },
    },
};
</script>

<style lang="scss">
    @import '../styles/_variables.scss';

    #patternEditor {
      display: inline-block;
    }

    #patternEditor {
      margin: 0 0 0 10px;

      h4 {
        display: inline;
      }

      ul {
        display: inline;

        li {
          display: inline;
          cursor: pointer;
        }

        button, select {
          margin: 0;
          background-color: #666;
          color: #b6b6b6;
          border-radius: 0;
          border: 0;

          &:hover {
            color: #fff;
          }
        }
      }
    }

    /* tablet view */

    @media screen and ( min-width: $app-width ) {
      #patternEditor {
        /* show divider before section content */
        &:before {
          content: "";
          position: absolute;
          border-left: 1px solid #666;
          margin-top: -10px;
          height: 100%;
        }
      }
    }

    /* everything above mobile view and below app width */

    @media screen and ( min-width: $mobile-width ) and ( max-width: $app-width ) {
      #patternEditor {
        /* TODO: we're now hiding our interface from these users... */
        display: none;
      }
    }

    /* phone view */

    @media screen and ( max-width: $mobile-width ) {
      #patternEditor  {
        display: none; /* only visible when settings mode is active */
      }

      #patternEditor {
        h2 {
          display: none;
        }
        ul {
          display: flex;
          margin: 0;

          li {
            float: left;
            flex-grow: 1;
            position: relative;
          }
        }
      }
    }
</style>
