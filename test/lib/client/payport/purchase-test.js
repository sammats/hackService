'use strict';
var assert = require('chai').assert,
    expect = require('chai').expect,
    sinon = require('sinon');

describe('PayPort client purchase', function() {
    var payportClient = require('../../../../lib/client/payport/payport_client.js'),
        apiClient = require('../../../../lib/client/api_client.js'),
        payportPurchase = require('../../../../lib/client/payport/purchase.js'),
        params;

    beforeEach(function() {

        sinon.spy(payportClient, 'post');
        sinon.stub(apiClient, 'request').returns('');

    });

    afterEach(function() {

        payportClient.post.restore();
        apiClient.request.restore();

    });

    it('should perform credit card purchase', function() {
        params = {
            body: 'mock body',
            gtid: 'mockGtid',
            userExtKey: 'mockUserKey'
        };

        payportPurchase.doPurchase(params, function() {});

        assert(payportClient.post.calledWith('/user/mockUserKey/purchase', {
            body: params.body,
            gtid: params.gtid
        }));
    });

    it('should perform PayPal purchase', function() {
        params = {
            body: 'mock body',
            gtid: 'mockGtid',
            userExtKey: 'mockUserKey',
            offsite : true
        };

        payportPurchase.doPurchase(params, function() {});

        assert(payportClient.post.calledWith('/user/mockUserKey/purchase/offsite', {
            body: params.body,
            gtid: params.gtid
        }));

    });

    it('should perform sync UCM profiles', function() {
        params = {
            body: 'mock body',
            gtid: 'mockGtid',
            userExtKey: 'mockUserKey',
            offsite : false,
            syncUCM : true
        };

        payportPurchase.doPurchase(params, function() {});

        assert(payportClient.post.calledWith('/user/mockUserKey/purchase?syncUCM=1', {
            body: params.body,
            gtid: params.gtid
        }));

    });

});
