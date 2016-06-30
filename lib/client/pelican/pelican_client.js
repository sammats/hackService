'use strict';
var client = require('../api_client.js');
var config = require('config').pelican;
var jsSHA = require('jssha');
var logger = require('../../utils/logger.js');

var getAuthParamsAsQueryString = function() {
    //var timestamp = new Date().getTime();
    var timestamp = Math.floor(Date.now() / 1000);
    return 'auth.appFamilyId=' + encodeURI(config.appFamilyId) +
        '&auth.partnerId=' + encodeURI(config.partnerId) +
            //'&auth.accessKey='+encodeURI(config.apiAccessKey) +
        '&auth.signature=' + getSignature(config.partnerId, config.appFamilyId, timestamp) +
        '&auth.timestamp=' + timestamp;
};

/*
 * Returns the request POST headers as JSON
 *
 *  @return {JSON Object} the request POST headers
 */
var getPostHeaders = function(contentType) {
    var timestamp = Math.floor(Date.now() / 1000);
    return {
        'Content-Type': contentType || 'application/x-www-form-urlencoded',
        'X-E2-HMAC-Signature': getSignature(config.partnerId, config.appFamilyId, timestamp),
        'X-E2-PartnerId': encodeURI(config.partnerId),
        'X-E2-AppFamilyId': encodeURI(config.appFamilyId),
        'X-E2-HMAC-Timestamp': timestamp,
        'X-Transaction-Ref': logger.getGtidFromNamespace()
    };
};

var getGetHeaders = function(params) {
    var gtid = logger.getGtidFromNamespace();
    if (!gtid) {
        gtid = params.gtid;
    }
    return {'X-Transaction-Ref': gtid, 'Connection': 'keep-alive'};
};

function getSignature(partnerId, appFamilyId, timestamp) {
    var message = new Array(partnerId, appFamilyId, timestamp).join('');
    var hmac = new jsSHA(message, 'ASCII');
    var signature = hmac.getHMAC(config.apiSecret, 'ASCII', 'SHA-256', 'HEX');
    return signature;
}

/*
 * Creates a Pelican request object
 *
 *  @return {JSON Object} the request
 */
var getRequest = function(uri, params, contentType, method) {

    var request = {
        host: config.hostname,
        port: config.port,
        path: config.path,
        method: method,
        headers: '',
        timeout: config.timeout,
        useHttp: config.useHttp,
        rejectUnauthorized: false,
        body: ''
    };

    if (method !== 'GET' && typeof params === 'string') {
        request.path = client.getURL(request.path + uri);
        request.headers = getPostHeaders(contentType);
        request.body = params;
    } else {
        var url = client.getURL(request.path + uri, params);
        var operator = url.indexOf('?') === -1 ? '?' : '&';
        request.path = url + operator + getAuthParamsAsQueryString();
        request.headers = getGetHeaders(params);
    }

    return request;
};

exports.get = function(uri, params, callback) {
    return client.request(getRequest(uri, params, null, 'GET'), callback);
};

exports.post = function(uri, params, contentType, callback) {
    return client.request(getRequest(uri, params, contentType, 'POST'), callback);
};
