// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
'use strict';

var client = require('../https_client.js');
var apiclient = require('../api_client.js');
var crypto = require('crypto');
var urlencode = require('urlencode');
var config = require('config').oxygen;
var logger = require('../../utils/logger.js');

var getRequest = function(req) {
    var oauth_timestamp = Math.floor(Date.now() / 1000);
    var url = config.url + req.query.userId;

    var paramsString = 'format=' + config.format + '&';
    paramsString += 'oauth_consumer_key=' + config.oauth_consumer_key + '&';
    paramsString += 'oauth_nonce=' + config.oauth_nonce + '&';
    paramsString += 'oauth_signature_method=' + config.oauth_signature_method + '&';
    paramsString += 'oauth_timestamp=' + oauth_timestamp + '&';
    paramsString += 'oauth_token=' + '' + '&';
    paramsString += 'oauth_version=' + config.oauth_version;

    var baseString = urlencode(config.method) + '&';
    baseString += urlencode(url) + '&';
    baseString += urlencode(paramsString);

    var hmac = crypto.createHmac('sha1', config.oauth_consumer_secret + '&');
    var hash2 = hmac.update(baseString);
    var encoding = 'base64';
    var signature = hmac.digest(encoding);

    url += '?' + paramsString + '&oauth_signature=' + urlencode(signature);

    var path = url.substring(url.indexOf('/api'));

    var headers = {
        'X-Transaction-Ref': req.headers['X-Transaction-Ref'],
        'Connection': 'keep-alive'
    };

    var request = {
        host: config.host,
        //port : 443,
        path: path,
        method: 'GET',
        headers: headers,
        timeout: config.timeout,
        rejectUnauthorized: false
    };

    return request;
};

var getHealthcheckRequest = function(req) {

    var headers = {
        'X-Transaction-Ref': req.headers['X-Transaction-Ref']
    };

    var request = {
        host: config.host,
        path: config.healthpath,
        method: 'GET',
        headers: headers,
        rejectUnauthorized: false
    };

    return request;
};

exports.get = function(req, callback) {
    client.request(getRequest(req), callback);
};

exports.getHealthcheck = function(req, callback) {
    apiclient.request(getHealthcheckRequest(req), callback);
};

