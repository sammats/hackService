'use strict';
var client = require('../https_client.js');
var config = require('config').ucmGetProfile;
var fs = require('graceful-fs');
var logger = require('../../utils/logger.js');

var ucmPfxBuffer;

var getRequest = function(oxygenId, gtid) {
    if (!ucmPfxBuffer) {
        ucmPfxBuffer = fs.readFileSync(config.clientCertPath);
    }

    var payload = {};
    payload.LookupRequest = {};
    payload.LookupRequest.IdentityType = 'OxygenId';
    payload.LookupRequest.Identity = oxygenId;

    var dataString = JSON.stringify(payload);

    var headers = {
        'Content-Type': 'application/json',
        'X-Transaction-Ref': gtid,
        'Connection': 'keep-alive'
    };

    var request = {
        host: config.host,
        port: config.port,
        path: config.path,
        method: 'POST',
        headers: headers,
        body: dataString,
        timeout: config.timeout,
        pfx: ucmPfxBuffer,
        passphrase: config.clientCertPwd,
        rejectUnauthorized: false
    };

    return request;
};

exports.post = function(oxygenId, gtid, callback) {
    client.request(getRequest(oxygenId, gtid), callback);
};

exports.cleanUcmPfxBuffer = function() {
    ucmPfxBuffer = null;
};
