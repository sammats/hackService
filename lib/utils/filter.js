'use strict';

var _ = require('lodash');

/**
 * Recognizer the type of property being passed and filters it accordingly
 * @param json
 * @returns {*}
 */
exports.filter = function(json) {
    var type = typeof json,
        temp;

    if (type === 'string') {
        if (isJsonString(json)) {
            temp = JSON.parse(json);
            encryptedParamRemover(temp);
            temp = JSON.stringify(temp);
        } else {
            temp = encryptedParamRemoverString(json);
        }
        return temp;
    }

    if (type !== 'object') {
        return json;
    }

    encryptedParamRemover(json);
    return json;
};

/**
 * Removes encrypted objectes from JSON
 * @param json
 */
function encryptedParamRemover(json) {
    var type;

    _.forOwn(json, function(value, key) {
        if (key === 'encryptedCardNumber' || key === 'encryptedCVV') {
            delete json[key];
        }

        type = typeof json[key];

        if (type === 'object' && type !== 'function') {
            encryptedParamRemover(value);
        }
    });
}

/**
 * Removes encrypted strings from string
 * @param str
 * @returns {string|XML|*}
 */
function encryptedParamRemoverString(str) {
    var ccSubStr = str.substring(str.indexOf('"encryptedCardNumber"') + 'encryptedCardNumber'.length + 1),
        cvvSubStr = str.substring(str.indexOf('"encryptedCVV"') + 'encryptedCVV'.length + 1);

    str = str.replace(ccSubStr, '');
    str = str.replace(cvvSubStr, '');

    return str;
}

/**
 * Returns true if string is json.
 * @param string1
 * @returns {boolean}
 * @constructor
 */
function isJsonString(string1) {
    var value = string1;
    var length = value.length - 1;
    return value[0] === '{' && value[length] === '}' || value[0] === '[' && value[length] === ']';
}
