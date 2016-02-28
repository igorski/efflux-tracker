/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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
var TIA = module.exports =
{
    /**
     * code table that shows all possible frequencies that
     * can be played back over the Atari's TIA, based on the
     * Eckhard Strolberg's frequency chart
     *
     * the comments behind each of the Objects indicate how much cents
     * the pitch is off a perfect note on either an NTSC or PAL setup
     */
    table :
    {
        // percussive sounds used for beat creation

        PERCUSSION : [
            { note: "KICK",   code: "%10011110" },
            { note: "HAT",    code: "%01100000" },
            { note: "SNARE",  code: "%01101000" },
            { note: "SNARE2", code: "%10000110" }
        ],

        // "a tuning that allows for the most bass notes. It is mostly from the C scale tuned up about 50 cents."

        SETUP_1 :
        {
            BASS : [
                { note: "b", octave: 5, code: "%00100000" }, // +45  +32
                { note: "b", octave: 4, code: "%00100001" }, // +45  +32
                { note: "e", octave: 4, code: "%00100010" }, // +43  +30
                { note: "h", octave: 3, code: "%00100011" }, // +45  +32
                { note: "g", octave: 3, code: "%00100100" }, // +58  +45
                { note: "e", octave: 3, code: "%00100101" }, // +43  +30
                { note: "b", octave: 2, code: "%00100111" }, // +42  +32
                { note: "a", octave: 2, code: "%00101000" }, // +42  +28
                { note: "g", octave: 2, code: "%00101001" }, // +59  +45
                { note: "e", octave: 2, code: "%00101011" }, // +43  +31
                { note: "c", octave: 2, code: "%00101110" }, // +56  +44
                { note: "b", octave: 1, code: "%00101111" }, // +46  +32
                { note: "a", octave: 1, code: "%00110001" }, // +39  +27
                { note: "g", octave: 1, code: "%00110011" }, // +59  +45
                { note: "e", octave: 1, code: "%00110111" }, // +44  +28
                { note: "d", octave: 1, code: "%00111010" }, // +41  +27
                { note: "c", octave: 1, code: "%00111101" }, // +58  +42
                { note: "h", octave: 0, code: "%00111111" }  // +44  +33
            ],

            PITFALL : [
                { note: "b", octave: 5, code: "%01000000" }, // +45  +32
                { note: "b", octave: 4, code: "%01000001" }, // +45  +32
                { note: "e", octave: 4, code: "%01000010" }, // +43  +30
                { note: "h", octave: 3, code: "%01000011" }, // +45  +32
                { note: "g", octave: 3, code: "%01000100" }, // +58  +45
                { note: "e", octave: 3, code: "%01000101" }, // +43  +30
                { note: "b", octave: 2, code: "%01000111" }, // +42  +32
                { note: "a", octave: 2, code: "%01001000" }, // +42  +28
                { note: "g", octave: 2, code: "%01001001" }, // +59  +45
                { note: "e", octave: 2, code: "%01001011" }, // +43  +31
                { note: "c", octave: 2, code: "%01001110" }, // +56  +44
                { note: "b", octave: 1, code: "%01001111" }, // +46  +32
                { note: "a", octave: 1, code: "%01010001" }, // +39  +27
                { note: "g", octave: 1, code: "%01010011" }, // +59  +45
                { note: "e", octave: 1, code: "%01010111" }, // +44  +28
                { note: "d", octave: 1, code: "%01011010" }, // +41  +27
                { note: "c", octave: 1, code: "%01011101" }, // +58  +42
                { note: "h", octave: 0, code: "%01011111" }  // +44  +33
            ],

            SQUARE : [
                { note: "f", octave: 6, code: "%00001010" }, // +39  +25
                { note: "d", octave: 6, code: "%00001100" }, // +49  +36
                { note: "f", octave: 5, code: "%00010101" }, // +39  +26
                { note: "e", octave: 5, code: "%00010110" }, // +62  +48
                { note: "d", octave: 5, code: "%00011001" }, // +49  +36
                { note: "c", octave: 5, code: "%00011100" }, // +60  +47
                { note: "b", octave: 4, code: "%00011110" }  // +45  +32
            ],

            LEAD : [
                { note: "a#", octave: 4, code: "%10101010" }, // +39  +23
                { note: "g",  octave: 4, code: "%10101100" }, // +48  +34
                { note: "a#", octave: 3, code: "%10110101" }, // +37  +24
                { note: "a",  octave: 3, code: "%10110110" }, // +60  +47
                { note: "g",  octave: 3, code: "%10111001" }, // +47  +34
                { note: "f",  octave: 3, code: "%10111100" }, // +59  +45
                { note: "e",  octave: 3, code: "%10111110" }  // +43  +30
            ],

            SAW : [
                { note: "f#", octave: 3, code: "%11001010" }, // +50  +37
                { note: "d#", octave: 3, code: "%11001100" }, // +61  +48
                { note: "f#", octave: 2, code: "%11010101" }, // +51  +36
                { note: "d#", octave: 2, code: "%11011001" }, // +61  +48
                { note: "d",  octave: 2, code: "%11011011" }, // +34  +20
                { note: "c",  octave: 2, code: "%11011110" }  // +56  +44
            ]
        },

        // "more square and lead tones from the C scale tuned slightly flat. However, there are almost no bass notes so
        // this setup is pretty hard to use if you want to use bass notes, but really great if you can do without bass."

        SETUP_2 :
        {
            LOW_BASS : [
                { note: "b",  octave: 0, code: "%xxx01010" }, // -11  -22
                { note: "g#", octave: 0, code: "%xxx01100" }  //   0  -13
            ],

            BASS : [
                { note: "f#", octave: 2, code : "%00101010" }, //  -6  -19
                { note: "f",  octave: 1, code : "%00110110" }, // +16   +4 (a little too sharp)
                { note: "d#", octave: 1, code : "%00111001" }, //  +4   -9 (slightly sharp, use saw w/this)
                { note: "c",  octave: 1, code : "%00111110" }  //   0  -11
            ],

            PITFALL : [
                { note: "f#", octave: 2, code : "%01001010" }, //  -6  -19
                { note: "f",  octave: 1, code : "%01010110" }, // +16   +4 (a little too sharp)
                { note: "d#", octave: 1, code : "%01011001" }, //  +4   -9 (slightly sharp, use saw w/this)
                { note: "c",  octave: 1, code : "%01011110" }  //   0  -11
            ],

            SQUARE : [
                { note: "b", octave: 8, code: "%00000001" }, //  -9  -23
                { note: "e", octave: 8, code: "%00000010" }, // -11  -25
                { note: "b", octave: 7, code: "%00000011" }, // -10  -23
                { note: "g", octave: 7, code: "%00000100" }, //  +4   -9
                { note: "e", octave: 7, code: "%00000101" }, // -11  -25
                { note: "b", octave: 6, code: "%00000111" }, //  -9  -23
                { note: "a", octave: 6, code: "%00001000" }, // -13  -27
                { note: "g", octave: 6, code: "%00001001" }, //  +4   -9
                { note: "e", octave: 6, code: "%00001011" }, // -11  -25
                { note: "c", octave: 6, code: "%00001110" }, //  +2  -11
                { note: "b", octave: 5, code: "%00001111" }, // -10  -23
                { note: "a", octave: 5, code: "%00010001" }, // -14  -27
                { note: "g", octave: 5, code: "%00010011" }, //  +4   -9
                { note: "e", octave: 5, code: "%00010111" }, // -12  -25
                { note: "d", octave: 5, code: "%00011010" }, // -16  -29
                { note: "c", octave: 5, code: "%00011101" }, //  +2  -11
                { note: "b", octave: 4, code: "%00011111" }  //  -9  -23
            ],

            LEAD : [
                { note: "e", octave: 8, code: "%10100000" }, // -11  -25
                { note: "e", octave: 7, code: "%10100001" }, // -11  -25
                { note: "a", octave: 6, code: "%10100010" }, // -14  -27
                { note: "e", octave: 6, code: "%10100011" }, // -11  -25
                { note: "c", octave: 6, code: "%10100100" }, //  +2  -11
                { note: "a", octave: 5, code: "%10100101" }, // -14  -27
                { note: "e", octave: 5, code: "%10100111" }, // -12  -25
                { note: "d", octave: 5, code: "%10101000" }, // -16  -29
                { note: "c", octave: 5, code: "%10101001" }, //  +2  -11
                { note: "a", octave: 4, code: "%10101011" }, // -13  -27
                { note: "f", octave: 4, code: "%10101110" }, //   0  -13
                { note: "e", octave: 4, code: "%10101111" }, // -11  -25
                { note: "d", octave: 4, code: "%10110001" }, // -16  -29
                { note: "c", octave: 4, code: "%10110011" }, //  +3  -11
                { note: "a", octave: 3, code: "%10110111" }, // -14  -27
                { note: "g", octave: 3, code: "%10111010" }, // -17  -31
                { note: "f", octave: 3, code: "%10111101" }, //  +1  -13
                { note: "e", octave: 3, code: "%10111111" }  // -11  -25
            ],

            SAW : [
                { note: "c",  octave: 7, code: "%11000000" }, // +2   -1
                { note: "c",  octave: 6, code: "%11000001" }, // +2   -1
                { note: "f",  octave: 5, code: "%11000010" }, //  0   -1
                { note: "c",  octave: 5, code: "%11000011" }, // +2   -1
                { note: "f",  octave: 4, code: "%11000101" }, //  0  -13
                { note: "c",  octave: 4, code: "%11000111" }, // +3  -11
                { note: "a#", octave: 3, code: "%11001000" }, // -2  -15
                { note: "f",  octave: 3, code: "%11001011" }, // +1  -13
                { note: "c",  octave: 3, code: "%11001111" }, // +3  -11
                { note: "h",  octave: 2, code: "%11010000" }, // -3  -16
                { note: "a#", octave: 2, code: "%11010001" }, //  0  -14 (goes well w/bass d#1)
                { note: "a",  octave: 2, code: "%11010010" }, // +5   -8
                { note: "f",  octave: 2, code: "%11010111" }, //  0  -12
                { note: "d#", octave: 2, code: "%11011010" }, // -5  -18 (goes well w/bass d#1)
                { note: "c",  octave: 2, code: "%11011111" }  // +3  -11
            ]
        },

        // "This gives you the most notes in Saw tuned to C# slightly sharp"

        SETUP_3 :
        {
            BASS : [
                { note: "f#", octave: 2, code: "%00101010" }, //  -6  -19
                { note: "d#", octave: 2, code: "%00101100" }, //  +4   -9
                { note: "f#", octave: 1, code: "%00110101" }, //  -4  -20
                { note: "f",  octave: 1, code: "%00110110" }, // +16   +4
                { note: "d#", octave: 1, code: "%00111001" }, //  +4   -9
                { note: "c#", octave: 1, code: "%00111100" }, // +19   +5
                { note: "c",  octave: 1, code: "%00111110" }  //   0  -11
            ],

            PITFALL : [
                { note: "f#", octave: 2, code: "%01001010" }, //  -6  -19
                { note: "d#", octave: 2, code: "%01001100" }, //  +4   -9
                { note: "f#", octave: 1, code: "%01010101" }, //  -4  -20
                { note: "f",  octave: 1, code: "%01010110" }, // +16   +4
                { note: "d#", octave: 1, code: "%01011001" }, //  +4   -9
                { note: "c#", octave: 1, code: "%01011100" }, // +19   +5
                { note: "c",  octave: 1, code: "%01011110" }  //   0  -11
            ],

            SAW : [
                { note: "c",  octave: 7,  code: "%11000000" }, //  +2   -1
                { note: "c",  octave: 6,  code: "%11000001" }, //  +2   -1
                { note: "f",  octave: 5,  code: "%11000010" }, //   0   -1
                { note: "c",  octave: 5,  code: "%11000011" }, //  +2   -1
                { note: "g#", octave: 4,  code: "%11000100" }, // +16   +3
                { note: "f",  octave: 4,  code: "%11000101" }, //   0  -13
                { note: "c",  octave: 4,  code: "%11000111" }, //  +3  -11
                { note: "a#", octave: 3,  code: "%11001000" }, //  -2  -15
                { note: "g#", octave: 3,  code: "%11001001" }, // +15   +2
                { note: "f",  octave: 3,  code: "%11001011" }, //  +1  -13
                { note: "c#", octave: 3,  code: "%11001110" }, // +13   +1
                { note: "c",  octave: 3,  code: "%11001111" }, //  +3  -11
                { note: "a#", octave: 2,  code: "%11010001" }, //   0  -14
                { note: "g#", octave: 2,  code: "%11010011" }, // +16   +3
                { note: "f",  octave: 2,  code: "%11010111" }, //   0  -12
                { note: "d#", octave: 2,  code: "%11011010" }, //  -5  -18
                { note: "c#", octave: 2,  code: "%11011101" }, // +15    0
                { note: "c",  octave: 2,  code: "%11011111" }  //  +3  -11
            ],

            SQUARE : [
                { note: "c",  octave: 6, code: "%00001110" }, //  +2  -11
                { note: "a#", octave: 5, code: "%00010000" }, // -15  -28
                { note: "g#", octave: 5, code: "%00010010" }, //  -7  -20
                { note: "f#", octave: 5, code: "%00010100" }, // +20   +7
                { note: "c",  octave: 5, code: "%00011101" }  //  +2  -11
            ],

            LEAD : [
                { note: "c",  octave: 6, code: "%10100100" }, //  +2  -11
                { note: "c",  octave: 5, code: "%10101001" }, //  +2  -11
                { note: "f#", octave: 4, code: "%10101101" }, // +20   +6
                { note: "c#", octave: 4, code: "%10110010" }, //  -9  -22
                { note: "f",  octave: 4, code: "%10101110" }, //   0  -13
                { note: "c",  octave: 4, code: "%10110011" }, //  +3  -11
                { note: "g#", octave: 3, code: "%10111000" }, // +15   +2
                { note: "f#", octave: 3, code: "%10111011" }, // +19   +6
                { note: "f",  octave: 3, code: "%10111101" }  //  +1  -13
            ]
        }
    }
};
