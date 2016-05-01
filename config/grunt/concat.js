module.exports =
{
    // copy third party libraries

    vendor :
    {
        src : [ "<%= config.project.modules %>/dspjs/dsp.js" ],
        dest : "<%= config.target.env %>/vendor/vendor.js"
    },

    // copy fixtures

    fixtures :
    {
        // add Array braces to encapsulate all files
        options: {
            banner: '[',
            footer: ']',
            separator: ','
        },
        src : [ "<%= config.project.root %>/fixtures/**/*.json" ],
        dest : "<%= config.target.env %>/Fixtures.js"
    }
};
