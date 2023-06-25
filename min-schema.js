const schema = require('./schema.json');
const fs = require('fs');
fs.writeFileSync('./schema.min.json', JSON.stringify(schema));
const stats = fs.statSync('./schema.min.json');
console.log('size = ', stats.size); // 1.5kb