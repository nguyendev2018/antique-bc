/* eslint-disable */
const fs = require('fs');
const translations = require('./schemaTranslations-all.json');
const schema = require('./schema.json');

const translationByText = Object.keys(translations).reduce((_translationByText, key) => {
    const text = translations[key].default;
    if (_translationByText[text]) {
        console.warn(`Duplicated keys '${key}', '${_translationByText[text]}'`);
    }
    _translationByText[text] = key;
    return _translationByText;
}, {});

function getKey(text) {
    return translationByText[text] !== undefined ? translationByText[text] : text;
}

const usedKeys = [];

schema.forEach(group => {
    usedKeys.push(group.name);
    group.settings.forEach(setting => {
        if (setting.label) {
            usedKeys.push(setting.label);
        }
        if (setting.content) {
            usedKeys.push(setting.content);
        }
        if (Array.isArray(setting.options)) {
            setting.options.forEach(option => {
                if (option.label) {
                    usedKeys.push(option.label);
                }
                if (option.group) {
                    usedKeys.push(option.group);
                }
            });
        }
    });
});

fs.writeFileSync('./schema-compressed.json', JSON.stringify(schema));

const newTranslations = Object.keys(translations).filter(key => usedKeys.includes(key))
    .reduce((accum, key) => ({ ...accum, [key]: translations[key] }), {});

fs.writeFileSync('./schemaTranslations-used.json', JSON.stringify(newTranslations, null, 2));
