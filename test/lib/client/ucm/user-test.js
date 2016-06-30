'use strict';

var sinon = require('sinon'),
    expect = require('chai').expect,
    assert = require('chai').assert,
    user = require('../../../../lib/client/ucm/user'),
    ucmClient = require('../../../../lib/client/ucm/ucm_client'),
    httpsClient = require('../../../../lib/client/https_client');

describe('UCM user', function() {

    var sandbox = sinon.sandbox.create();

    beforeEach(function() {

    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should get billing profiles', function() {

        var mockCallback = function() {};
        sandbox.spy(ucmClient, 'post');
        sandbox.stub(httpsClient, 'request').returns('');

        user.getBillingProfiles('some OxygenId', 'some gtid', mockCallback);

        assert(ucmClient.post.calledWith('some OxygenId', 'some gtid', mockCallback));

    });
});
