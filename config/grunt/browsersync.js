module.exports = {
    bsFiles: {
	src: [
		'dist/dev/**/*'
	]
    },
    options: {
        watchTask: true,
        server: {
            baseDir: '<%= config.target.dev %>',
            index: 'index.html'
        }
    }
};
