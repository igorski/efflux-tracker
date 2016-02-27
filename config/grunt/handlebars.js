module.exports =
{
  compile: {
    options: {
      namespace: "slocum",
      commonjs: true,
      processName: function(filePath) {
        // template name is the filename without the suffix
        var snippets = filePath.split( "/" );
        return snippets[ snippets.length - 1].replace( ".hbs", "" );
      }
    },
    files: {
      "src/handlebars/templates.js": "templates/**/*.hbs"
    }
  }
};
