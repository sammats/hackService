'use strict';
var assert = require('chai').assert,
    expect = require('chai').expect,
    should = require('chai').should,
    sinon = require('sinon'),
    openidConfig = require('config').openidConfig,
    openid = require('openid'),
    passport = require('../../../lib/adsk-openid-client/AdskPassport.js'),
    auth = require('../../../lib/adsk-openid-client/auth.js');

describe('Authentication', function() {

    var strategy, sandbox, openidReplyingPartySpy, strategySpy, response, error;

    strategy = require('../../../lib/adsk-openid-client/strategies/AdskStrategy.js');
    sandbox = sinon.sandbox.create();

    beforeEach(function() {

        sandbox.spy(passport, 'init');
        openidReplyingPartySpy = sandbox.spy(openid, 'RelyingParty');
        strategySpy = sandbox.spy(strategy.prototype, 'authenticate');
        sandbox.stub(strategy.prototype, 'discoverOP');

    });

    afterEach(function() {
        sandbox.restore();sandbox.restore();
    });

    it('Passport Login Initialization', function() {

        var req = {
            providerUrl: openidConfig.providerUrl
        };

        var res = {};
        passport.login(req, res, function(err, cb) {
            error = err;
            response = cb;
        });

        assert(passport.init.called);
        assert(passport.init.calledWith(auth.login));
        assert(passport.init.calledOnce);
        assert(!passport.init.calledTwice);
        expect(auth.login).to.have.property('providerURL');
        expect(auth.login).to.have.property('returnURL');
        expect(auth.login).to.have.property('realm');
        expect(auth.login).not.to.have.property('register');
        expect(auth.login.providerURL).to.equal(req.providerUrl);
        expect(auth.login).to.have.property('customui');

    });

    it('Test if Open Id library got called with all the required openid request parameters for Login', function() {

        var req = {
            providerUrl: 'accounts-dev.autodesk.com'
        };
        var res = {};
        passport.login(req, res, function(err, cb) {
            error = err;
            response = cb;
        });

        assert(strategySpy.called);
        expect(openidReplyingPartySpy.called);
        assert(openidReplyingPartySpy.calledOnce);
        assert(!openidReplyingPartySpy.calledTwice);

    });

    it('Test Passport Register Initialization', function() {

        var req = {
            providerUrl: 'accounts-dev.autodesk.com'
        };
        var res = {};
        passport.register(req, res, function(err, cb) {
            error = err;
            response = cb;
        });

        assert(passport.init.called);
        assert(passport.init.calledWith(auth.register));
        assert(passport.init.calledOnce);
        assert(!passport.init.calledTwice);
        expect(auth.register).to.have.property('providerURL');
        expect(auth.register).to.have.property('returnURL');
        expect(auth.register).to.have.property('realm');
        expect(auth.register).to.have.property('customui');
        expect(auth.register).to.have.property('register');

    });

    it('Test if Open Id library got called with all the required openid request parameters for Register', function() {

        var req = {
            providerUrl: 'accounts-dev.autodesk.com'
        };
        var res = {};
        passport.register(req, res, function(err, cb) {
            error = err;
            response = cb;
        });

        assert(strategySpy.called);
        expect(openidReplyingPartySpy.called);
        assert(openidReplyingPartySpy.calledOnce);
        assert(!openidReplyingPartySpy.calledTwice);

    });

});
