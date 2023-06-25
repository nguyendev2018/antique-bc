module.exports = {
    jqueryui: {
        src: ['assets/scss/vendor/jquery-ui/*.scss'],
        overwrite: true,
        replacements: [{
            from: /images\//g,
            to: '../img/vendor/jquery-ui/'
        }]
    }
};