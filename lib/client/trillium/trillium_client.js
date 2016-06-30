'use strict';
var client = require('../api_client.js'),
    config = require('config').trillium,
    jstoxml = require('jstoxml'),
    logger = require('../../utils/logger.js');

var getRequest = function(uri, params, method) {
    var xmlBody = jstoxml.toXML(params.body);
    return {
        hostname: config.hostname,
        port: config.port,
        path: client.getURL(config.path + uri),
        method: method,
        headers: getHeaders(params, xmlBody),
        timeout: config.timeout,
        useHttp: config.useHttp,
        body: xmlBody
    };
};

exports.post = function(uri, params, callback) {
    return client.request(getRequest(uri, params, 'POST'), callback);
};

function getHeaders(params, body) {
    return {
        'Content-Type': 'application/xml',
        'accept': 'application/xml',
        'X-Transaction-Ref': (params.gtid ? params.gtid : logger.getGtidFromNamespace()),
        'Content-Length': Buffer.byteLength(body)
    };
}

