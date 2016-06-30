'use strict';
var sinon = require('sinon'),
    chai = require('chai'),
    expect = require('chai').expect,
    adskPassport = require('../../../lib/adsk-openid-client/AdskPassport'),
    auth = require('../../../lib/adsk-openid-client/auth'),
    openid = require('openid'),
    logger = require('../../../lib/utils/logger.js');

chai.use(require('chai-string'));

describe('ADSK Passport', function() {
    var verifyCallback,
        fakeRequest,
        sandbox = sinon.sandbox.create();

    beforeEach(function() {
        verifyCallback = function() {
        };
        fakeRequest = {
            query: 'fake options'
        };
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('verifyAuthentication', function() {

        it('should verify authentication', function() {

            sandbox.spy(auth, 'verifylogin');

            adskPassport.verifyAuthentication(fakeRequest);

            expect(auth.verifylogin.calledTwice).to.be.true;

        });

        it('should call init', function() {

            sandbox.spy(adskPassport, 'init');

            adskPassport.verifyAuthentication(fakeRequest);

            expect(adskPassport.init.calledOnce).to.be.true;

        });

        it('should call authenticate', function() {

            sandbox.spy(auth.services.passport, 'authenticate');

            adskPassport.verifyAuthentication(fakeRequest);

            expect(auth.services.passport.authenticate.calledOnce).to.be.true;

        });

    });

    describe('logout', function() {

        it('should redirect user to logout URL', function(done) {

            var response = {
                'writeHead': function(status, body) {
                    expect(status).to.equal(302);
                    expect(body.Location).to.have.entriesCount('/Authentication/Logout?', 1);
                    done();
                },
                'end': function() {
                }
            };

            adskPassport.logout(null, response);
        });

    });

    describe('handleOpenIdErrors', function() {
        var fakeNext,
            response;

        beforeEach(function() {
            fakeNext =  function() {
            };

            response = {
                'writeHead': function(status, body) {
                },
                'send': function() {
                },
                'write': function() {
                }
            };

            sandbox.stub(logger, 'error');
        });

        it('should continue processing if not OpenID error', function(done) {
            fakeNext =  function() {
                done();
            };

            adskPassport.handleOpenIdErrors({}, fakeRequest, response, fakeNext);
        });

        it('should write error status and header', function(done) {
            response.writeHead = function(status, head) {
                expect(status).to.equal(500);
                expect(head['Content-Type']).to.equal('text/html; charset=UTF-8');
                done();
            };

            adskPassport.handleOpenIdErrors({}, fakeRequest, response, fakeNext);
        });

        it('should write error body', function(done) {
            fakeRequest._passport = 'some value';
            response.write = function(body) {
                expect(body).to.startsWith('<script type=\'text/javascript\'> var responseJson');
                done();
            };

            adskPassport.handleOpenIdErrors({}, fakeRequest, response, fakeNext);
        });

        afterEach(function() {
            logger.error.restore();
        });

    });

});
