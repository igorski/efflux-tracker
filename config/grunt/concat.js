module.exports =
{
    // append meta and additional regex into production build and move into target folder
    tweenlite :
    {
        src : [ "node_modules/gsap/src/minified/TweenLite.min.js",
                "node_modules/gsap/src/minified/easing/EasePack.min.js",
                "node_modules/gsap/src/minified/plugins/CSSPlugin.min.js",
                "node_modules/gsap/src/minified/plugins/ScrollToPlugin.min.js"
               ],
        dest : "<%= config.target.env %>/vendor/vendor.js"
    }
};
