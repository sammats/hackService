'use strict';
var sinon = require('sinon'),
    expect = require('chai').expect,
    assert = require('chai').assert,
    uuid = require('uuid'),
    sessionConfig = require('config').sessionConfig,
    auth = require('../../../lib/auth/auth.js'),
    cache = require('../../../lib/utils/cache.js'),
    client = {
        on: function(str, callback) {
            return callback;
        },
        psetex: function(key, milliseconds, value) {
        },
        end: function() {
        },
        get: function(sessionId, callback) {
            return callback(null, 'paola-003:expectedGrantToken:1412701962932');
        }
    };

describe('Auth', function() {

    describe('generateSessionObj', function() {
        var error, response;

        it('should return the session params', function() {
            var userExtKey = 'paola-003';
            var expectedSessionId = 'expectedSessionId';
            var expectedGrantToken = 'expectedGrantToken';
            var uuidStub = sinon.stub(uuid, 'v4');
            uuidStub.onCall(0).returns(expectedSessionId);
            uuidStub.onCall(1).returns(expectedGrantToken);

            sinon.stub(cache, 'getClient', function(callback) {
                return callback(null, client);
            });

            sinon.spy(client, 'psetex');

            auth.generateSessionObj(userExtKey, function(err, res) {
                error = err;
                response = res;
            });

            expect(error).to.equals(null);
            expect(response).to.not.be.equals(null);
            expect(response).to.not.be.undefined;
            expect(response.sessionId).to.equals(expectedSessionId);
            expect(response.grantToken).to.equals(expectedGrantToken);
            assert(cache.getClient.called);
            assert(client.psetex.called);
            sinon.assert.calledTwice(uuid.v4);

            cache.getClient.restore();
            client.psetex.restore();
            uuid.v4.restore();
        });
    });

    describe('refreshGrantTokenForSessionId', function() {
        it('should refresh the grantToken', function(done) {
            var sessionId = 'sessionId1234';
            var userExtKey = 'paola-003';
            var expectedGrantToken = 'expectedGrantToken';
            var uuidStub = sinon.stub(uuid, 'v4');
            uuidStub.onCall(0).returns(expectedGrantToken);

            sinon.stub(cache, 'getClient', function(callback) {
                return callback(null, client);
            });

            sinon.spy(client, 'psetex');

            auth.refreshGrantTokenForSessionId(sessionId, userExtKey, function(error, response) {
                expect(error).to.be.null;
                expect(response.grantToken).to.equal(expectedGrantToken);
                assert(cache.getClient.called);
                assert(client.psetex.called);
                sinon.assert.calledOnce(uuid.v4);

                //TODO clean restore
                cache.getClient.restore();
                client.psetex.restore();
                uuid.v4.restore();
                done();
            });

        });
    });

    describe('validateSession', function() {
        var error, response;
        var sessionId = 'sessionId1234';
        var grantToken = 'granToken1234';
        var userExtKey = 'paola-003';

        beforeEach(function() {
            sinon.stub(cache, 'getClient', function(callback) {
                return callback(null, client);
            });

            sinon.spy(client, 'psetex');
        });

        afterEach(function() {
            cache.getClient.restore();
            client.psetex.restore();
        });

        it('should return status OK when the session is valid', function() {
            sinon.stub(client, 'get', function(sessionId, callback) {
                var res = userExtKey + ':' + grantToken + ':' + new Date().getTime();
                return callback(null, res);
            });

            auth.validateSession(sessionId, grantToken, userExtKey, true, true, function(err, res) {
                error = err;
                response = res;
            });

            expect(error).to.equals(null);
            expect(response).to.equals(sessionConfig.statusOK);
            assert(client.psetex.calledOnce);

            client.get.restore();
        });

        it('should return status unauthorized when get returns null', function() {
            sinon.stub(client, 'get', function(sessionId, callback) {
                return callback(null, null);
            });

            auth.validateSession(sessionId, grantToken, userExtKey, true, true, function(err, res) {
                error = err;
                response = res;
            });

            expect(error).to.equals(null);
            expect(response).to.equals(sessionConfig.statusUnauthorized);
            assert(client.psetex.notCalled);

            client.get.restore();
        });

        it('should return status unauthorized when grantToken is different', function() {
            sinon.stub(client, 'get', function(sessionId, callback) {
                var res = userExtKey + ':' + grantToken + ':' + new Date().getTime();
                return callback(null, res);
            });

            auth.validateSession(sessionId, grantToken + '1', userExtKey, true, true, function(err, res) {
                error = err;
                response = res;
            });

            expect(error).to.equals(null);
            expect(response).to.equals(sessionConfig.statusUnauthorized);
            assert(client.psetex.notCalled);

            client.get.restore();
        });

        it('should return status unauthorized when userExtKey is different and checkUserExtKey is true', function() {
            sinon.stub(client, 'get', function(sessionId, callback) {
                var res = userExtKey + ':' + grantToken + ':' + new Date().getTime();
                return callback(null, res);
            });

            auth.validateSession(sessionId, grantToken, userExtKey + '1', true, true, function(err, res) {
                error = err;
                response = res;
            });

            expect(error).to.equals(null);
            expect(response).to.equals(sessionConfig.statusUnauthorized);
            assert(client.psetex.notCalled);

            client.get.restore();
        });

        it('should return status OK when userExtKey is different and checkUserExtKey is false', function() {
            sinon.stub(client, 'get', function(sessionId, callback) {
                var res = userExtKey + ':' + grantToken + ':' + new Date().getTime();
                return callback(null, res);
            });

            auth.validateSession(sessionId, grantToken, userExtKey + '1', false, true, function(err, res) {
                error = err;
                response = res;
            });

            expect(error).to.equals(null);
            expect(response).to.equals(sessionConfig.statusOK);
            assert(client.psetex.calledOnce);

            client.get.restore();
        });

        it('should return status grantTokenExpired when timestamp is greater ' +
            'than the grantTokenTtl and checkTimestamp is true', function() {
            sinon.stub(client, 'get', function(sessionId, callback) {
                var res = userExtKey + ':' + grantToken + ':' + new Date('01/01/1970 00:00:00').getTime();
                return callback(null, res);
            });

            auth.validateSession(sessionId, grantToken, userExtKey, true, true, function(err, res) {
                error = err;
                response = res;
            });

            expect(error).to.equals(null);
            expect(response).to.equals(sessionConfig.statusGrantTokenExpired);
            assert(client.psetex.calledOnce);

            client.get.restore();
        });

        it('should return status OK when timestamp is greater than the grantTokenTtl' +
            'and checkTimestamp is false', function() {
            sinon.stub(client, 'get', function(sessionId, callback) {
                var res = userExtKey + ':' + grantToken + ':' + new Date('01/01/1970 00:00:00').getTime();
                return callback(null, res);
            });

            auth.validateSession(sessionId, grantToken, userExtKey, true, false, function(err, res) {
                error = err;
                response = res;
            });

            expect(error).to.be.null;
            expect(response).to.equals(sessionConfig.statusOK);
            assert(client.psetex.calledOnce);

            client.get.restore();
        });
    });
});
