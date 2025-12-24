const xss = require('xss');

function sanitizeInput(str) {
    if (typeof str !== 'string') return str;
    return xss(str.trim().substring(0, 1000));
}

module.exports = sanitizeInput;
