'use strict';

var sinon = require('sinon'),
    expect = require('chai').expect,
    openIdError = require('../../../../lib/adsk-openid-client/errors/internalopeniderror');

describe('OpenId internal error', function() {

    it('should create object', function() {
        var error = new openIdError();
        expect(error).to.not.be.empty;
    });

    it('should convert error message to string', function() {
        var error = new openIdError('some error message');
        expect(error.toString()).to.equal('some error message');
    });

    it('should convert Error class and message to string', function() {
        var error = new openIdError('some error message', new Error('some error'));
        expect(error.toString()).to.equal('some error message (Error: some error)');
    });

    it('should convert error message and message to string', function() {
        var error = new openIdError('some error message', {message: 'some error'});
        expect(error.toString()).to.equal('some error message (message: some error)');
    });

});
