'use strict';
var client = require('./pelican_client.js');
var _ = require('lodash');

/**********************************************************************************************************
 Function    : getOfferingsByProductLine

 @param {String} store - the external Store identifier
 @param {String} productLine - the product line identifier
 @param {String} country - the two character country code
 @param {String} storeType - the store type identifier
 @param {String} storeId - the store id
 @param {Object} callback - callback object
 @return {Object} callback

 Description : This will make a call to the pelican restful API "Offerings" service end-point.
 This will fetch offering information based on the provided params

 ***********************************************************************************************************/

exports.getOfferingsByProductLine = function(store, productline, country, callback) {

    var params = {
        'filter[store.externalKey]': store,
        'filter[productLine]': productline,
        'filter[country]': country
    };

    return client.get('/offerings/', params, callback);
};

/**********************************************************************************************************
 Function    : getOfferingsByPriceIds

 @param {String} store - the external Store identifier
 @param {String} priceIds - one or priceIds, comma separated.
 @return {Object} callback

 Description : This will make a call to the pelican restful API "Get Offerings" service end-point.
 This will fetch the offerings based on the filtering criteria passed as "params"

 ***********************************************************************************************************/

exports.getOfferingsByPriceIds = function(store, priceIds, callback) {
    var params = {
        'filter[externalKey]': store,
        'filter[priceIds]': priceIds.toString()
    };

    return client.get('/offerings/', params, callback);

};

