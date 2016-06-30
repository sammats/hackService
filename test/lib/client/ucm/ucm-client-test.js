'use strict';

var assert = require('chai').assert,
    sinon = require('sinon'),
    httpsClient = require('../../../../lib/client/https_client.js'),
    config = require('config').ucmGetProfile,
    fs = require('graceful-fs'),
    ucmClient = require('../../../../lib/client/ucm/ucm_client.js');

describe('UCM client', function() {
    var req, callback, request, oxygenId, gtid;

    describe('Test post', function() {

        beforeEach(function() {
            sinon.stub(httpsClient, 'request').returns('');
            sinon.stub(fs, 'readFileSync').returns('ucmPfxBuffer');

            req = {
                query : {
                    userId : 'userId'
                },
                headers: {
                    'X-Transaction-Ref': ''
                }
            };

            callback = 'callback';
            oxygenId = 'oxygenId';
            gtid = 'gtid';

            request = getRequest(oxygenId, gtid);
        });

        afterEach(function() {
            httpsClient.request.restore();
            fs.readFileSync.restore();
        });

        it('should create a request and call https_client', function() {
            ucmClient.cleanUcmPfxBuffer();

            ucmClient.post(oxygenId, gtid, callback);

            assert(httpsClient.request.called);
            assert(httpsClient.request.calledWith(request, callback));
            assert(fs.readFileSync.called);
        });

        it('should not change a ucmPfxBuffer if there is one already', function() {
            ucmClient.post(oxygenId, gtid, callback);

            assert(httpsClient.request.calledWith(request, callback));
            assert(fs.readFileSync.notCalled);
        });
    });

    function getRequest(oxygenId, gtid) {
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
            pfx: 'ucmPfxBuffer',
            passphrase: config.clientCertPwd,
            rejectUnauthorized: false
        };

        return request;
    }
});
