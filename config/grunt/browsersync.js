module.exports = {
    bsFiles: {
	src: [
		'dist/dev/**/*'
	]
    },
    options: {
        watchTask: true,
        ghostMode: {
            clicks: false,
            forms: false,
            scroll: false
        },
        server: {
            baseDir: '<%= config.target.dev %>',
            index: 'index.html'
        }
    }
};
