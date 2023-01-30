/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2020-2022 - https://www.igorski.nl
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
export const FLAC = "audio/flac";
export const MPG  = "audio/mpeg";
export const MP3  = "audio/mp3";
export const MP4  = "audio/mp4";
export const OGG  = "audio/ogg"; // not for Safari, see https://en.wikipedia.org/wiki/HTML5_audio
export const WAV  = "audio/wav";
export const WEBM = "audio/webm"; // not for Safari, see https://en.wikipedia.org/wiki/HTML5_audio

export const ACCEPTED_FILE_TYPES       = [ FLAC, MPG, MP3, MP4, OGG, WAV, WEBM ];
export const ACCEPTED_FILE_EXTENSIONS  = [ ".flac", ".mp3", ".mp4", ".ogg", ".webm", ".wav" ];
export const PATTERN_FILE_EXTENSION    = ".xpt";
export const PROJECT_FILE_EXTENSION    = ".xtk";
export const INSTRUMENT_FILE_EXTENSION = ".xit";
