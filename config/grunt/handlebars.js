module.exports =
{
  compile: {
    options: {
      namespace: "effluxTemplates",
      commonjs: false,
      processName: function(filePath) {
        // template name is the filename without the suffix
        var snippets = filePath.split( "/" );
        return snippets[ snippets.length - 1].replace( ".hbs", "" );
      }
    },
    files: {
      "<%= config.target.env %>/handlebars/templates.js": "src/templates/**/*.hbs"
    }
  }
};
