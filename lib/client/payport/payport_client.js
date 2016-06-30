'use strict';

var client = require('../api_client.js');
var config = require('config').payport;
var fs = require('graceful-fs');
var logger = require('../../utils/logger.js');

var payportPfxBuffer;

/*
 * Creates a PSP Handler request object
 * If the request is different than a GET, this method adds the params received on the request.body
 *
 *  @return {JSON Object} the request
 */
var constructRequest = function(uri, params, method) {
    if (!payportPfxBuffer) {
        payportPfxBuffer = fs.readFileSync(config.clientCertPath);
    }

    var headers = {
        'Content-Type': 'application/json',
        'X-Transaction-Ref': params.gtid,
        'Connection': 'keep-alive'
    };

    var request = {
        host: config.hostname,
        port: config.port,
        path: config.path + uri,
        useHttp: config.useHttp,
        method: method,
        headers: headers,
        body: '',
        timeout: config.timeout,
        pfx: payportPfxBuffer,
        passphrase: config.clientCertPwd,
        rejectUnauthorized: false
    };

    if (method !== 'GET') {
        request.body = JSON.stringify(params.body);
    }

    return request;
};

exports.get = function(uri, params, callback) {
    return client.request(constructRequest(uri, params, 'GET'), callback);
};

exports.post = function(uri, params, callback) {
    return client.request(constructRequest(uri, params, 'POST'), callback);
};

exports.put = function(uri, params, callback) {
    return client.request(constructRequest(uri, params, 'PUT'), callback);
};

exports.getHealthcheck = function(req, callback) {
    return client.request(
        constructRequest(config.healthpath, {gtid: req.headers['X-Transaction-Ref']}, 'GET'),
        callback);
};
