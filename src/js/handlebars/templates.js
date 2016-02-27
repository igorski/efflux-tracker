module.exports = function(Handlebars) {

this["slocum"] = this["slocum"] || {};

this["slocum"]["asm"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, alias1=this.lambda, alias2=this.escapeExpression;

  return "; TITLE\n;-------------------------------------------------------------\n; @author "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.meta : depth0)) != null ? stack1.author : stack1), depth0))
    + " "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.meta : depth0)) != null ? stack1.created : stack1), depth0))
    + "\n\n\n;-------------------------------------------------------------\n; CONFIGURATION\n;-------------------------------------------------------------\n; tempo range 1 (fast) - 10 (slow)\n; no exact BPM (apparently peaks at 150 bpm)\n\nTEMPODELAY equ "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.meta : depth0)) != null ? stack1.tempo : stack1), depth0))
    + "\n\n; global normalization of sounds\n\nsoundTurnArray\n	byte 8, 0, 5, 9\n	byte 0, 6, 4, 0\n\n;-------------------------------------------------------------\n; Sound Type Array\n;\n; Required by Slocums renderer, this reserves\n; eight of ten possible sounds for the track.\n;\n; Default Sound Type Setup:\n; 000 0 Square  = 4\n; 001 1 Bass    = 6\n; 010 2 Pitfall = 7\n; 011 3 Noise   = 8\n;\n; 100 4 Buzz    = 15\n; 101 5 Lead    = 12\n; 110 6 Saw     = 1\n; 111 7 Engine  = 3\n;\n\nsoundTypeArray\n    byte 4,6,7,8\n    byte 15,12,1,14\n\n;-------------------------------------------------------------\n; HATS\n;\n; Fucking convenient. Specify the pattern in 32nd notes below.\n; 0 = silence, 1 = playing. This pattern is repeated for each\n; measure, Slocums hi-hat render is short enough to disregard it\n; when writing patterns for other channels.\n;\n; You can also specify the measure that the high hat\n; starts playing with HATSTART.  You may want to have\n; and intro part without the high hat then have it\n; come in later.  Or if you don't want to use it at all,\n; then set HATSTART to 255.\n;\n; Finally, you can specify the high hat volume (0-15), the\n; pitch (0-31), and the high hat sound type.  Refer to the\n; table above for sound type values.  I typically use\n; sound type 8 (Noise) and pitch 0 which sounds like a pretty\n; good high hat.  But you may find other interesting settings.\n\nhatPattern\n	byte %10001000\n	byte %10101010\n	byte %10001000\n	byte %10001010\n\n\nHATSTART equ "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.hats : depth0)) != null ? stack1.start : stack1), depth0))
    + "\n\nHATVOLUME equ "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.hats : depth0)) != null ? stack1.volume : stack1), depth0))
    + "\nHATPITCH equ "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.hats : depth0)) != null ? stack1.pitch : stack1), depth0))
    + "\nHATSOUND equ "
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.hats : depth0)) != null ? stack1.sound : stack1), depth0))
    + "\n\n\n;-------------------------------------------------------------\n; SONG SEQUENCE\n;\n; \"song1\" and \"song2\" are constants for Slocums sequencer indicating\n; each of the two oscillators we can use to work with two channels audio\n; each sequence refers to a pattern defined below\n;\n; NOTE: max 255 patterns\n; NOTE: 255 is required at the end of the list to indicate the end has been reached\n\nsong1\n	byte 0,0	; silence\n\n	byte 255	; end / loop\n\n\nsong2\n	byte 0,0	; silence\n\n	byte 255	; end / loop\n\n;-------------------------------------------------------------\n; SONG MEASURES\n;\n; Slocums sequencer defines \"patternArrayH\" for non-attenuated\n; audio and \"patternArrayL\" for a reduced output\n;\n; each word contains a set of four patterns, effectively creating\n; a full measure of music\n;\n; NOTE: each array can have a max of 64 sets of each 4 patterns\n;\n; index for patternArrayH starts at 0, patternArrayL at 128 (go figure)\n\n\n; Higher volume patterns\n\npatternArrayH\n\n	word mute,mute,mute,mute				; 0\n\n; Lower volume patterns\n\n	\npatternArrayL\n\n;-------------------------------------------------------------\n; PATTERNS:\n\n; NICE TO KNOW:\n;\n; - each pattern lasts a quarter note and is divided into 8 steps\n;   for 32nd notes\n; - each step specifies pitch and soundtype\n; - the pattern arrays defined above assemble the patterns in fours\n;   to complete a full measure\n;\n; NOTE ENTRY:\n;\n; Each note is encoded with sound type and pitch (i.e. %00111000)\n; with the first 3 bits shaping the sound type, remaining 5 bits for pitch\n; (255/%11111111 == silence)\n; \n; possible sound shapes (keep soundTypeArray defined above in mind, yo)\n;\n; 000 Square  (high square wave)\n; 001 Bass    (fat bass sound)\n; 010 Pitfall (sound of hitting a lot in pitfall)\n; 011 Noise   (white noise)\n; 100 Buzz    (hard buzzy sound)\n; 101 Lead    (lower square wave)\n; 110 Saw     (sounds kind of like a sawtooth wave)\n; 111 Engine  (engine sound)\n;\n; ACCENTS:\n;\n; The ninth number at the end of each pattern defines which notes\n; are accented. 0 = no accent, 1 = yep.\n;\n; Each of the 8 bits corresponds to each of the 8 notes defined in the pattern\n\n\n; silence\n\nmute\n    byte 255,255,255,255\n    byte 255,255,255,255\n\n    byte 255\n";
},"useData":true});

this["slocum"]["metaView"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<div id=\"meta-editor\">\n    <h1>Song properties</h1>\n    <input type=\"text\" id=\"songTitle\" placeholder=\"title\" />\n    <input type=\"text\" id=\"songAuthor\" placeholder=\"author name\" />\n    <select id=\"songTempo\">\n        <option value=\"1\">40 BPM</option>\n        <option value=\"2\">80 BPM</option>\n        <option value=\"3\">100 BPM</option>\n        <option value=\"4\">120 BPM</option>\n        <option value=\"5\">125 BPM</option>\n        <option value=\"6\">130 BPM</option>\n        <option value=\"7\">135 BPM</option>\n        <option value=\"8\">140 BPM</option>\n        <option value=\"9\">145 BPM</option>\n        <option value=\"10\">150 BPM</option>\n    </select>\n</div>";
},"useData":true});

this["slocum"]["noteEntry"] = Handlebars.template({"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    return "<h4>Note entry editor</h4>\n<input type=\"text\" id=\"sound\" placeholder=\"Sound\" />\n<input type=\"text\" id=\"note\" placeholder=\"Note\" />\n<input type=\"text\" id=\"octave\" placeholder=\"Octave\" />\n<div class=\"close-button\">x</div>\n";
},"useData":true});

this["slocum"]["patternEditor"] = Handlebars.template({"1":function(depth0,helpers,partials,data) {
    var stack1;

  return "<ul class=\"pattern\">\n"
    + ((stack1 = helpers.each.call(depth0,depth0,{"name":"each","hash":{},"fn":this.program(2, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "</ul>\n";
},"2":function(depth0,helpers,partials,data) {
    var stack1;

  return "    <li>\n"
    + ((stack1 = helpers['if'].call(depth0,(depth0 != null ? depth0.sound : depth0),{"name":"if","hash":{},"fn":this.program(3, data, 0),"inverse":this.program(5, data, 0),"data":data})) != null ? stack1 : "")
    + "    </li>\n";
},"3":function(depth0,helpers,partials,data) {
    var alias1=this.lambda, alias2=this.escapeExpression;

  return "            <span class=\"sound\">\n                "
    + alias2(alias1((depth0 != null ? depth0.sound : depth0), depth0))
    + "\n            </span>\n            <span class=\"note\">\n                "
    + alias2(alias1((depth0 != null ? depth0.note : depth0), depth0))
    + "\n                "
    + alias2(alias1((depth0 != null ? depth0.octave : depth0), depth0))
    + "\n            </span>\n";
},"5":function(depth0,helpers,partials,data) {
    return "            ----\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1;

  return "<h3>Pattern editor</h3>\n"
    + ((stack1 = helpers.each.call(depth0,(depth0 != null ? depth0.channels : depth0),{"name":"each","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "");
},"useData":true});

return this["slocum"];

};