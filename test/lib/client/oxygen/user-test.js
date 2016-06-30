'use strict';

var sinon = require('sinon'),
    expect = require('chai').expect,
    assert = require('chai').assert,
    user = require('../../../../lib/client/oxygen/user'),
    oxygenClient = require('../../../../lib/client/oxygen/oxygen_client');

describe('Oxygen user', function() {

    var mockCallback,
        mockRequest;

    beforeEach(function() {
        mockCallback = function() {};
        mockRequest = {
            'headers':{'X-Transaction-Ref':'some ref'},
            'query':{'userId': 'some user id'}
        };
    });

    it('should get user profile', function() {

        sinon.spy(oxygenClient, 'get');

        user.getUserProfile(mockRequest, mockCallback);

        expect(oxygenClient.get.calledWith(mockRequest, mockCallback));

        oxygenClient.get.restore();
    });

    it('should get health check', function() {

        sinon.spy(oxygenClient, 'getHealthcheck');

        user.getHealthcheck(mockRequest, mockCallback);

        assert(oxygenClient.getHealthcheck.calledWith(mockRequest, mockCallback));

        oxygenClient.getHealthcheck.restore();
    });

});
