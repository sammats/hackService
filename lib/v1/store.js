'use strict';
var storeClient = require('../client/pelican/store.js'),
    logger = require('../utils/logger.js'),
    dbClient = require('../client/db_client.js'),
    _ = require('lodash'),
    async = require('async'),
    cacheEnabled = require('config').cacheEnabled;

/**
 * The function gets Pelican store by external store key
 * @param {Object} request
 * @param {callback} callback
 * @return {JSON Object} This returns either the JSON storeData for Shipping Methods and supported countries or Error
 */
exports.getStore = function(request, callback) {

    if (cacheEnabled) {
        return getStoreDataWithCachingToRedis(request.params.extStoreKey, callback);
    }
    return getStoreDataWithoutCachingToRedis(request.params.extStoreKey, callback);

};
/**
 * Private function gets Store Data with Caching it to Redis in  normalized specific format
 * @param {params} extKey
 * @param {callback} callback
 * @return {JSON Object} This returns the JSON Normalized storeData
 */
function getStoreDataWithCachingToRedis(extKey, callback) {
    dbClient.getStoreByExtStoreKey(extKey, function(err, store) {

        if (err) {
            return getStoreDataFromPelican(extKey, err.isCode(404), callback);
        }
        logger.debug('Sending Store Data from REDIS');
        return callback(null, store);

    });
}
/**
 * Private function gets Store Data WITHOUT Caching it to Redis in  normalized specific format
 * @param {params} extKey
 * @param {callback} callback
 * @return {JSON Object} This returns the JSON Normalized storeData
 */
function getStoreDataWithoutCachingToRedis(extKey, callback) {
    getStoreDataFromPelican(extKey, false, callback);
}
/**
 * Private function gets Store Data from Pelican and convert it to Normalize format and store in Redis if callToRedis input is true
 * @param {params} extKey
 * @param {callToRedis} callToRedis is a flag which tells if data to be cached or not
 * @param {callback} callback
 * @return {JSON Object} This returns the JSON Normalized storeData
 */
function getStoreDataFromPelican(extKey, callToRedis, callback) {
    storeClient.getStore(extKey, function(error, result) {
        if (error) {
            return callback(error);
        }
        var storeResult = getCountriesForStore(JSON.parse(result));
        if (callToRedis) {
            createStoreDataInRedis(extKey, storeResult, callback);
        } else {
            logger.debug('Sending Store Data from Pelican WITHOUT Caching it to REDIS');
            return callback(null, storeResult);
        }
    });
}
/**
 * Private function creates Store Data In Redis
 * @param {params} extKey
 * @param {JSON} storeResult - Normalize data to be stored in Cache
 * @param {callback} callback
 * @return {JSON Object} Returns the JSON Normalized storeData
 */
function createStoreDataInRedis(extKey, storeResult, callback) {
    //Create the new store in Redis and made a parallel async call
    async.parallel({
        createStore: function(done) {
            dbClient.createStore(extKey, storeResult, function(error, response) {
                if (error && error.isCode(504)) {
                    logger.debug('Sending Store Data from Pelican without creating a Store in REDIS');
                    done(null, storeResult);
                }
                logger.debug('Sending Store Data from Pelican after creating a Store in REDIS');
                done(null, response);

            });
        },
        replyStore: function(done) {
            done(null, storeResult);
        }
    }, function(err, results) {
        return callback(null, storeResult);
    });

}

/**
 * Private function used to store and send back the normalized data in specific format
 * @param {Object} raw Pelican Data
 * @return {JSON Object} This returns the JSON Normalized storeData
 */
function getCountriesForStore(storeResponse) {

    var response = {};

    response.id = storeResponse.data.id;
    response.externalKey = storeResponse.data.externalKey;
    response.name = storeResponse.data.name;
    response.storeType = storeResponse.data.storeType;
    response.properties = storeResponse.data.properties;
    response.countries = [];

    response.countries = _.map(storeResponse.data.countries, function(country) {
        var countries = {};
        countries.country = country.country;
        countries.shippingMethods = [];
        countries.priceList = getPriceListForCountry(storeResponse.included, country);
        countries.shippingMethods = getShippingMethodsForCountry(storeResponse.included, country);
        return countries;
    });

    return response;
}
/**
 * Private function used to get the associated Price List for a country
 * @param {Object} includes
 * @param {Object} country
 * @return {JSON Object} This returns the JSON Normalized PriceList for a country
 */
function getPriceListForCountry(includes, country) {
    return _.find(includes, {'id': country.links.priceList.linkage.id, 'type': country.links.priceList.linkage.type});
}
/**
 * Private function used to get the associated Shipping Methods for a country and for countries associated with Store
 * @param {Object} includes
 * @param {Object} country
 * @param {Object} countries
 * @return {JSON Object} This returns the JSON Normalized Shipping Methods for a country and for countries associated with Store
 */
function getShippingMethodsForCountry(includes, country, countries) {
    return _.map(country.links.shippingMethods.linkage, function(link) {
        return _.find(includes, {'id': link.id, 'type': link.type});
    });
}
