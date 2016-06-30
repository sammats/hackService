'use strict';
var client = require('./pelican_client.js');
var utils = require('../../utils/util.js');
var config = require('config').pelican;

exports.getByExternalKey = function(extKey, callback) {
    return client.get('/user', {externalKey: extKey}, callback);
};

exports.getActiveSubscriptions = function(extKey, callback) {
    return client.get('/subscriptions', {userExternalKey: extKey}, callback);
};

exports.getCatalog = function(params, callback) {
    if (utils.isValid(params.subId)) {
        return client.get('/catalog', {
            userExternalKey: params.extKey,
            subscriptionID: params.subId,
            gtid: params.gtid,
            storeTypeExternalKey: params.storeType,
            country:params.country
        }, callback);
    } else {
        return client.get('/catalog', {
            userExternalKey: params.extKey,
            offerExternalKey: params.offeringId,
            gtid: params.gtid,
            storeTypeExternalKey: params.storeType,
            country:params.country
        }, callback);
    }
};

exports.getHealthcheck = function(req, callback) {
    return client.get(config.healthpath, {gtid: req.headers['X-Transaction-Ref']}, callback);
};
