module.exports =
{
    // copy third party libraries

    vendor :
    {
        src : [ "<%= config.project.modules %>/dspjs/dsp.js" ],
        dest : "<%= config.target.env %>/vendor/vendor.js"
    }
};
