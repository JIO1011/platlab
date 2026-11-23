/** Solo para dependency-cruiser: resuelve el alias @/ del sitio público. */
const path = require('node:path');

module.exports = { resolve: { alias: { '@': path.join(__dirname, 'apps/site/src') } } };
