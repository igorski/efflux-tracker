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
                        @change="handlePatternStepChange">
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
import { mapMutations } from 'vuex';

export default {
    methods: {
        ...mapMutations([
           'setHelpTopic',
            'clearSelection'
        ]),
        handlePatternClear() {
            efflux.activeSong.patterns[ editorModel.activePattern ] = PatternFactory.createEmptyPattern( editorModel.amountOfSteps );
            this.clearSelection();
            Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
            Pubsub.publishSync( Messages.CREATE_LINKED_LISTS );
        },
        handlePatternCopy() {
            patternCopy = ObjectUtil.clone( efflux.activeSong.patterns[ editorModel.activePattern ] );
        },
        handlePatternPaste() {
            if ( patternCopy ) {
                PatternFactory.mergePatterns( efflux.activeSong.patterns[ editorModel.activePattern ], patternCopy, editorModel.activePattern );
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
            song.patterns = PatternUtil.addEmptyPatternAtIndex( patterns, editorModel.activePattern + 1, editorModel.amountOfSteps );
        
            Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );
            Pubsub.publish( Messages.PATTERN_SWITCH, ++editorModel.activePattern );
        },
        handlePatternDelete() {
            const song     = efflux.activeSong,
                  patterns = song.patterns;
        
            if ( patterns.length === 1 ) {
                handlePatternClear( aEvent );
            }
            else {
                song.patterns = PatternUtil.removePatternAtIndex( patterns, editorModel.activePattern );
        
                if ( editorModel.activePattern > 0 )
                    Pubsub.publish( Messages.PATTERN_SWITCH, --editorModel.activePattern );
                else
                    Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
        
                Pubsub.publish( Messages.PATTERN_AMOUNT_UPDATED );
            }
        },
        handlePatternStepChange()
        {
            const song    = efflux.activeSong,
                  pattern = song.patterns[ editorModel.activePattern ];

            const oldAmount = pattern.steps;
            const newAmount = parseInt( Form.getSelectedOption( stepSelect ), 10 );

            // update model values
            pattern.steps = editorModel.amountOfSteps = newAmount;

            pattern.channels.forEach(( channel, index ) => {
                const transformed = new Array( newAmount );
                let i, j, increment;

                // ensure that the Array contains non-empty values
                for ( i = 0; i < newAmount; ++i ) {
                    transformed[ i ] = 0;
                }

                if ( newAmount < oldAmount )
                {
                    // reducing resolution, e.g. changing from 32 to 16 steps
                    increment = oldAmount / newAmount;

                    for ( i = 0, j = 0; i < newAmount; ++i, j += increment )
                        transformed[ i ] = channel[ j ];
               }
                else {
                    // increasing resolution, e.g. changing from 16 to 32 steps
                    increment = newAmount / oldAmount;

                    for ( i = 0, j = 0; i < oldAmount; ++i, j += increment )
                        transformed[ j ] = channel[ i ];
                }
                pattern.channels[ index ] = transformed;
            });

            Pubsub.publish( Messages.PATTERN_STEPS_UPDATED, newAmount );
            Pubsub.publishSync( Messages.REFRESH_PATTERN_VIEW );
        },
        handlePatternAdvanced() {
            Pubsub.publish( Messages.OPEN_ADVANCED_PATTERN_EDITOR );
        }
    }
};
</script>

<style lang="scss">
    @import '../styles/_variables.scss';

    #patternEditor {
      display: inline-block;
    }

    #patternEditor
    {
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

    @media screen and ( min-width: $app-width )
    {
      #patternEditor {
        // show divider before section content
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

    @media screen and ( min-width: $mobile-width ) and ( max-width: $app-width )
    {
      #patternEditor {
        // TODO: we're now hiding our interface from these users...
        display: none;
      }
    }

    /* phone view */

    @media screen and ( max-width: $mobile-width )
    {
      #patternEditor  {
        display: none; // only visible when settings mode is active
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
