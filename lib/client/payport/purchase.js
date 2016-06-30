'use strict';
var client = require('./payport_client.js');

/**
 * Makes a post to Payport purchase 'user/:userExternalKey/purchase' or
 * for PayPal 'user/:userExternalKey/purchase/offsite'
 * for a specific user and passing the req.body as parameter.
 * @param {Object} params
 * @param {Object} params.body Tax request information
 * @param {String} params.gtid
 * @param {String} params.userExtKey User external key in Pelican
 * @param {Boolean} params.offsite when falsy indicates Internal/Credit Card purchase, when true PayPal purchase
 * @param callback
 */
exports.doPurchase = function(params, callback) {
    var urlSuffix = params.offsite ? '/purchase/offsite' : '/purchase';
    urlSuffix += params.syncUCM ? '?syncUCM=1' : '';

    return client.post('/user/' + params.userExtKey + urlSuffix,
        {
        body: params.body,
        gtid: params.gtid
    }, callback);
};

