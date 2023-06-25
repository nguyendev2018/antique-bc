const fs = require('fs');
const config = require('./config.json');

config.variations.forEach(variation => {
    Object.keys(variation.settings).forEach(key => {
        if (typeof variation.settings[key] === 'object' || variation.settings[key] === config.settings[key]) {
            delete variation.settings[key];
        }
    })
});

fs.renameSync('./config.json', './config.json.original');
fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
