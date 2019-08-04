/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
export default
{
    // system messages

    SHOW_ERROR                : "SYSER", // payload is a String message that will be displayed in a popup (NotificationController)
    SHOW_FEEDBACK             : "SYSFB", // payload is a String message that will be displayed in a popup (NotificationController)
    SHOW_DIALOG               : "SYSDL", // payload is Object {{ message: string, title: string }}
    CONFIRM                   : "SYSCF", // payload is Object {{ message: string, title: string, confirm: Function, cancel: Function }}
    SHOW_LOADER               : "SYSSL",
    HIDE_LOADER               : "SYSHL",
    SHOW_BLIND                : "SYSSB",
    HIDE_BLIND                : "SYSHB",

    // UI messages

    DISPLAY_HELP                 : "UI:0", // payload is string name matching Handlebars template to show in help container
    CLOSE_OVERLAYS               : "UI:1", // payload consists of optional ViewController (references controller of overlay that should remain unclosed)
    OVERLAY_OPENED               : "UI:2",
    TOGGLE_INSTRUMENT_EDITOR     : "UI:3", // payload consists of number describing selected instrument index
    OPEN_SONG_BROWSER            : "UI:5",
    OPEN_MODULE_PARAM_PANEL      : "UI:8",  // payload is callback Function to be executed on panel close
    MENU_INITIALIZED             : "UI:MI",

    // song messages

    VALIDATE_AND_GET_SONG     : "SNGVG",  // payload consists of callback function receiving Song
    LOAD_SONG                 : "SNGLD",  // payload can be A) string (song id) or B) full Song object
    SAVE_SONG                 : "SNGSV",
    SONG_LOADED               : "SNGLDR", // payload consists of the Song that has been loaded
    TRANSFORM_LEGACY_SONG     : "SNGTF",  // payload is Song object

    // editor messages

    UPDATE_FILTER_SETTINGS              : "ED:4", // payload is Array [ instrument index, filter properties Object ]
    UPDATE_DELAY_SETTINGS               : "ED:5", // payload is Array [ instrument index, delay properties Object ]
    UPDATE_EQ_SETTINGS                  : "ED:6", // payload is Array [ instrument index, eq properties Object ]
    UPDATE_OVERDRIVE_SETTINGS           : "ED:7", // payload is Array [ instrument index, overdrive properties Object ]
};
