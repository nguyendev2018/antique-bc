module.exports = {
    jqueryui: {
        files: [{
            expand: true,
            cwd: 'node_modules/jquery-ui/themes/base',
            src: '*.css',
            dest: './assets/scss/vendor/jquery-ui',
            rename: function(dest, src) {
                return dest + '/' + src.replace(/([^\/]+)\.css/, '_$1.scss');
            }
        }, {
            expand: true,
            cwd: 'node_modules/jquery-ui/themes/base/images',
            src: '*',
            dest: './assets/img/vendor/jquery-ui',
        }]
    }
};
