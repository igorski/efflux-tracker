/**
* The MIT License (MIT)
*
* Igor Zinken 2019 - https://www.igorski.nl
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
    <div id="transportControls">
        <ul>
            <li id="playBTN" class="icon-play"></li>
            <li id="loopBTN" class="icon-loop"></li>
            <li id="recordBTN" class="disabled"></li>
            <li class="icon-metronome"></li>
            <li class="icon-settings"></li>
            <li class="section-divider"><!-- x --></li>
            <li id="patternBack">
                &lt;&lt;
            </li>
            <li id="currentPattern">
                <input class="current" value="1" maxlength="3">
                <span class="divider">/</span>
                <span class="total">1</span>
            </li>
            <li id="patternNext">
                &gt;&gt;
            </li>
        </ul>
        <ul id="tempoControl" class="wrapper input range">
            <li class="section-divider"><!-- x --></li>
            <li>
                <label for="songTempo">Tempo</label>
                <input type="range" name="tempo" id="songTempo" min="40" max="300" step="0.1" value="120">
                <span class="value" id="songTempoDisplay">120.0 BPM</span>
            </li>
        </ul>
    </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';

export default {

};
</script>

<style lang="scss" scoped>
    @import "../styles/_variables.scss";

    // generated font for all transporter icons

    @font-face {
      font-family: 'transporter';
      src: url('../fonts/transporter.eot');
      src: url('../fonts/transporter.eot#iefix') format('embedded-opentype'),
           url('../fonts/transporter.woff') format('woff'),
           url('../fonts/transporter.ttf') format('truetype'),
           url('../fonts/transporter.svg#transporter') format('svg');
      font-weight: normal;
      font-style: normal;
    }

    $transport-height: 42px; // height + border bottom

    #transportSection {
      background-color: #393b40;
    }

    #transportControls {
      font-family: Montserrat, Helvetica, Verdana, sans-serif;
      padding: 0;
      border: none;
      border-radius: 0;
      margin: 0 auto;
      min-width: 100%;
      max-width: $ideal-width;

      ul {
        list-style-type: none;

        li {
          display: inline;
          padding: .5em 0 .5em .5em;
          font-weight: bold;
          cursor: pointer;

          // loop button
          &#loopBTN {
            padding-left: 0;
          }

          // record button
          &#recordBTN {
            background-color: #d00e57;
            padding: 0 .65em;
            border-radius: 50%;
            margin-left: .75em;

            &.active {
              background-color: #FFF;
            }

            &.disabled {
              display: none;
            }
          }

          // measure indicator
          &#currentPattern {
            display: inline-flex;
            width: 95px;
            color: #FFF;

            span {
              flex-grow: 1;
              margin-top: 2px;
            }

            .current {
              width: 28px; // fits "333"
              height: 15px;
              border: 1px solid #999;
              font-weight: bold;
              margin-right: .5em;
              color: #FFF;
              background-color: transparent;
              text-align: center;
            }

            .total {
              background-color: #333;
              text-align: center;
              padding: 0 .5em;
            }
          }

          // pattern jump buttons
          &#patternNext {
            padding-left: 0;
          }

          &.icon-metronome {
            padding: 0 0 0 .5em;

            &.active {
              color: #FFF;
            }
          }

          &.icon-settings {
            display: none; // mobile only (see below)
          }

          &.icon-settings {
            padding: 0 .25em;
          }

          &.enabled {
            color: red;
          }
        }
      }

      // tempo control

      #tempoControl {
        padding: .5em 0 0 .5em;
        display: inline;

        label {
          margin-right: 1em;
          display: inline-block;
        }

        input {
          display: inline-block;
          margin: 0 .5em 0 0;
          vertical-align: middle;
        }

        .value {
          display: inline-block;
          font-weight: bold;
          font-style: italic;
          font-size: 90%;
        }
      }

      #songTempo {
        width: 150px;
      }

      /* icons */

      [class^="icon-"]:before,
      [class*=" icon-"]:before
      {
        font-family: "transporter";
        font-style: normal;
        font-weight: normal;
        speak: none;

        display: inline-block;
        text-decoration: inherit;
        width: 1em;
        margin-right: .2em;
        text-align: center;
        /* opacity: .8; */

        /* For safety - reset parent styles, that can break glyph codes*/
        font-variant: normal;
        text-transform: none;

        /* fix buttons height, for twitter bootstrap */
        line-height: 1em;

        /* Animation center compensation - margins should be symmetric */
        /* remove if not needed */
        margin-left: .2em;

        /* you can be more comfortable with increased icons size */
        /* font-size: 120%; */

        /* Uncomment for 3D effect */
        /* text-shadow: 1px 1px 1px rgba(127, 127, 127, 0.3); */
      }

      .icon-loop:before { content: '\e800'; } /* '' */
      .icon-metronome:before { content: '\e801'; } /* '' */
      .icon-play:before { content: '\e802'; } /* '' */
      .icon-settings:before { content: '\e803'; } /* '' */
      .icon-stop:before { content: '\e804'; } /* '' */

      [class^="icon-"].active {
        color: #FFF;
      }
    }

    /* ideal view */

    @media screen and ( min-width: $ideal-width ) {
      #transportControls {
        min-width: auto;
      }
    }

    /* everything above median  app size */

    @media screen and ( min-width: $app-width ) {
      #transportControls
      {
        // divides sections of the list

        .section-divider {
          padding: 0 .5em;

          &:before {
            position: absolute;
            z-index: 1;
            content: "";
            border-left: 1px solid #666;
            height: $transport-height;
          }
        }
      }
    }

    /* mobile view */

    @media screen and ( max-width: $mobile-width ) {
      #transportControls {
        background-color: inherit;

        label {
          display: none !important;
        }
        #currentPattern {
          width: auto;
        }
        #tempoControl {
          display: none;
        }
        ul li.icon-settings {
          display: inline;
        }
      }
    }
</style>
 