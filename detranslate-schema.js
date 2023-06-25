/* eslint-disable */
const fs = require('fs');
const translations = require('./schemaTranslations-all.json');
const schema = require('./schema.json');
const excludes = [
    "i18n.BannersMessaging",
    "i18n.PleaseSpecifyAMaximumImage",
    "i18n.NewsletterPopupDesc",
];

function translate(key) {
    return translations[key] !== undefined && !excludes.includes(key) ? translations[key].default : key;
}

schema.forEach(group => {
    group.name = translate(group.name);
    group.settings.forEach(setting => {
        if (setting.label) {
            setting.label = translate(setting.label);
        }
        if (setting.content) {
            setting.content = translate(setting.content);
        }
        if (Array.isArray(setting.options)) {
            setting.options.forEach(option => {
                if (option.label) {
                    option.label = translate(option.label);
                }
                if (option.group) {
                    option.group = translate(option.group);
                }
            });
        }
    });
});

fs.writeFileSync('./schema-detranslated.json', JSON.stringify(schema, null, 2));
fs.writeFileSync('./schema-detranslated-compressed.json', JSON.stringify(schema));

