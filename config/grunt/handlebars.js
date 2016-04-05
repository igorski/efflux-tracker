module.exports =
{
  compile: {
    options: {
      namespace: "ztracker",
      commonjs: true,
      processName: function(filePath) {
        // template name is the filename without the suffix
        var snippets = filePath.split( "/" );
        return snippets[ snippets.length - 1].replace( ".hbs", "" );
      }
    },
    files: {
      "src/js/handlebars/templates.js": "src/templates/**/*.hbs"
    }
  }
};
