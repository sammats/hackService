'use strict';
var assert = require('chai').assert,
    expect = require('chai').expect,
    sinon = require('sinon');

describe('PayPort client tax', function() {
    var payportClient = require('../../../../lib/client/payport/payport_client.js'),
        apiClient = require('../../../../lib/client/api_client.js'),
        payportTax = require('../../../../lib/client/payport/tax.js'),
        params;

    beforeEach(function() {

        sinon.spy(payportClient, 'post');
        sinon.stub(apiClient, 'request').returns('');

    });

    afterEach(function() {

        payportClient.post.restore();
        apiClient.request.restore();

    });

    it('should fetch tax data', function() {

        payportTax.getTaxes('fake params', function() {});

        assert(payportClient.post.calledWith('/tax', 'fake params'));
    });

});
