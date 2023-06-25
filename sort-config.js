const fs = require('fs');
const config = require('./config.json');


config.variations.forEach((variation, i) => {
    const settings = {};
    Object.keys(config.settings).forEach(key => {
        if (typeof variation.settings[key] !== 'undefined') {
            settings[key] = variation.settings[key];
        }
    });
    config.variations[i].settings = settings;
});

fs.renameSync('./config.json', './config.json.original');
fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
