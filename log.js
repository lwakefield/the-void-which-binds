const fs = require('fs');

function patch () {
    global.log = (namespace, msg) => {
        fs.appendFile('thevoid.log', `${new Date().toISOString()} [${namespace}] ${msg}\n`, () => {});
    };
}

module.exports.patch = patch;
