'use strict';

var dateFormat = require('dateformat');
var crypto = require('crypto');
var ld = require('lodash-node');
var _config = require('config');
var regionsMap = _config.regionsMap;
var partnersConfig = _config.partner;

exports.arrayIterator = function(arrayToIterate, callback) {
    var newArray = [];
    for (var i in arrayToIterate) {
        newArray.push(callback(arrayToIterate[i]));
    }
    return newArray;
};

exports.arrayFind = function(array, callback) {
    var length = array.length;
    for (var i = 0; i < length; i++) {
        if (callback(array[i])) {
            return array[i];
        }
    }
    return null;
};

exports.isJsonEqual = function(json1, json2) {
    return JSON.stringify(json1) === JSON.stringify(json2);
};

exports.arrayFilter = function(arrayToFilter, callback) {
    var filteredArray = [];
    for (var i in arrayToFilter) {
        var obj = arrayToFilter[i];
        var shouldInclude = callback(obj);
        if (shouldInclude) {
            filteredArray.push(obj);
        }
    }
    return filteredArray;
};

exports.forceArray = function forceArray(json) {
    if (json) {
        if (!json.length) {
            json = [json];
        }
        return json;
    }
    return [];
};

/*
 *  Convert date  to GMT Format
 *	@param {Object} date - Date Object
 *	@param {String} format - format String Object
 *  @return {String} dateformat
 */
exports.convertDateformat = function(inDate, gmtformat) {
    dateFormat.masks.hammerTime = gmtformat;
    return dateFormat(inDate, 'hammerTime');//dateFormat(now, "hammerTime");
};

/*
 *  Generate hmac hascode signature
 *	@param {String} hashCode - HashCode
 *	@param {String} secretKey - Secret Key
 *  @return {String} hmac Signature
 */
exports.getHmacSignature = function(hashCode, secretKey) {
    var hmac = crypto.createHmac('sha256', secretKey);
    var hash2 = hmac.update(hashCode);
    var encoding = 'base64';
    return hmac.digest(encoding);
};

exports.getStampDate = function(tDate, configParam, dateFormat) {
    var newDateObj = new Date(tDate.getTime() + configParam.expires * 1000);
    return this.convertDateformat(newDateObj, dateFormat);
};

/*
 * Checks if the parameter received is valid.
 * A parameter is considered valid if it is not null, not undefined and not empty.
 *	@param {String} parameter - THe parameter to be checked
 *  @return {Boolean} true if valid, false otherwise.
 */
function isValid(parameter) {
    if (ld.isNull(parameter) || ld.isUndefined(parameter) || ld.isEmpty(parameter)) {
        return false;
    }
    return true;
}

exports.isValid = isValid;

exports.getAsArray = function(param) {
    var array = [];

    if (param !== undefined) {
        if (param instanceof Array) {
            array = param;
        } else {
            array.push(param);
        }
    }

    return array;
};

/*
 Gets the Ip Address from the request.
 If X-Forwarded-For is present on the request, returns it. If not, returns the req.connection.remoteAddress
 */
exports.getIpAddress = function(req) {
    return req.ip || req.connection.remoteAddress;
};

/*
 Get the currency for the country received as parameter.
 The country must be inside a region in the regionsMap on config file.
 */
exports.getCurrency = function(country) {
    var countryCurrency = getCountryFromRegionsMap(country);

    return (countryCurrency ? countryCurrency.currency : null);
};

/*
 Get a specific country and its currency from regionsMap on config file.
 */
function getCountryFromRegionsMap(country) {
    for (var r in regionsMap) {
        var region = regionsMap[r];

        var countryCurrency = getCountryFromRegion(region, country);

        if (countryCurrency) {
            return countryCurrency;
        }
    }

    return null;
}

/*
 Get a specific country and its currency from inside the region.
 */
function getCountryFromRegion(region, country) {
    for (var c in region) {
        var countryCurrency = region[c];

        if (contains(countryCurrency, country)) {
            return countryCurrency;
        }
    }

    return null;
}

/*
 Returns the countries (but no the country's currency) that are on the same region than the country received as parameter.
 */
exports.getCountriesFromSameRegion = function(country) {
    var countries = [];
    var region = getRegion(country);

    for (var c in region) {
        var countryCurrency = region[c];

        countries.push(countryCurrency.country);
    }

    return countries;
};

/* Returns the partner config object or null if the partner doesn't exist */
exports.getPartnerConfig = function(partnerKey) {
    return partnersConfig[partnerKey.toLowerCase()] || null;
};

exports.checkUserCountrySupported = function(country) {
    var isSupportedCountry = getRegion(country).length;
    return !!isSupportedCountry;
};

/*
 Returns true if the list contains the value and false otherwise.
 */
function contains(list, value) {
    return ld.includes(list, value);
}

/*
 Get the region for a country.
 */
function getRegion(country) {
    for (var r in regionsMap) {
        var region = regionsMap[r];

        if (region && regionContainsCountry(region, country)) {
            return region;
        }
    }

    return [];
}
/*
 Checks if the region contains the country received as parameter. Returns true if it contains and false otherwise.
 */
function regionContainsCountry(region, country) {
    if (region && country) {
        for (var c in region) {
            var countryCurrency = region[c];

            if (contains(countryCurrency, country)) {
                return true;
            }
        }
    }

    return false;
}

exports.contains = contains;
