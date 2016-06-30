// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
'use strict';
var assert = require('chai').assert,
    sinon = require('sinon'),
    httpsClient = require('../../../../lib/client/https_client.js'),
    apiClient = require('../../../../lib/client/api_client.js'),
    oxygenClient = require('../../../../lib/client/oxygen/oxygen_client.js'),
    crypto = require('crypto'),
    config = require('config').oxygen,
    urlencode = require('urlencode');

describe('Oxygen client', function() {
    var req, callback, request;

    describe('get', function() {

        beforeEach(function() {

            sinon.stub(httpsClient, 'request').returns('');

            req = {
                query : {
                    userId : 'userId'
                },
                headers: {
                    'X-Transaction-Ref': ''
                }
            };

            callback = 'callback';

            request = getRequest(req);

        });

        afterEach(function() {
            httpsClient.request.restore();
        });

        it('should create a request and call https_client', function() {
            oxygenClient.get(req, callback);

            assert(httpsClient.request.calledWith(request, callback));
        });
    });

    describe('getHealthcheck', function() {
        beforeEach(function() {
            sinon.stub(apiClient, 'request').returns('');

            req = {
                headers: {
                    'X-Transaction-Ref': ''
                }
            };

            callback = 'callback';

            request = getHealthCheckRequest(req);
        });

        afterEach(function() {
            apiClient.request.restore();
        });

        it('should create a health check request and call api_client', function() {
            oxygenClient.getHealthcheck(req, callback);

            assert(apiClient.request.calledWith(request, callback));
        });
    });

    function getRequest(req) {
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

        return {
            host: config.host,
            //port : 443,
            path: path,
            method: 'GET',
            headers: headers,
            timeout: config.timeout,
            rejectUnauthorized: false
        };
    }

    function getHealthCheckRequest(req) {
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
    }
});
