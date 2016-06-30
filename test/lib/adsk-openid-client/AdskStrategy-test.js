'use strict';
var sinon = require('sinon'),
    expect = require('chai').expect,
    adskStrategy = require('../../../lib/adsk-openid-client/strategies/AdskStrategy'),
    openid = require('openid'),
    adskopenid = require('../../../lib/adsk-openid-client/strategies/AdskOpenid');

describe('ADSK Strategy', function() {
    var verifyCallback;

    beforeEach(function() {
        verifyCallback = function() {
        };
    });

    describe('constructor', function() {
        var options;

        beforeEach(function() {
            options = {
                'returnURL': 'some URL'
            };
        });

        it('should validate return URL', function() {
            var constructor = function() {
                adskStrategy({});
            };
            expect(constructor).to.throw('OpenID authentication requires a returnURL option');
        });

        it('should validate verification callback', function() {
            var constructor = function() {
                adskStrategy(options);
            };
            expect(constructor).to.throw('OpenID authentication strategy requires a verify callback');
        });

        it('should set the return URL', function() {
            var strategy = new adskStrategy(options, verifyCallback);
            expect(strategy._relyingParty.returnUrl).to.equal(options.returnURL);

        });

        it('should set the provider URL', function() {
            options.providerURL = 'provider URL';

            var strategy = new adskStrategy(options, verifyCallback);
            expect(strategy._providerURL).to.equal(options.providerURL);

        });

        it('should set the identifier Field', function() {
            options.identifierField = 'some field';

            var strategy = new adskStrategy(options, verifyCallback);
            expect(strategy._identifierField).to.equal(options.identifierField);

        });

        describe('Open ID extensions', function() {

            it('should add simple registration and attribute exchange when profile available', function() {
                options.profile = {};
                var strategy = new adskStrategy(options, verifyCallback);

                expect(strategy._relyingParty.extensions[0]).to.be.instanceof(openid.SimpleRegistration);
                expect(strategy._relyingParty.extensions[1]).to.be.instanceof(openid.AttributeExchange);
            });

            it('should add user interface when ui options available', function() {
                options.ui = {};
                var strategy = new adskStrategy(options, verifyCallback);

                expect(strategy._relyingParty.extensions[0]).to.be.instanceof(openid.UserInterface);
            });

            it('should add PAPE extension when PAPE options available', function() {
                options.pape = {};
                var strategy = new adskStrategy(options, verifyCallback);

                expect(strategy._relyingParty.extensions[0]).to.be.instanceof(openid.PAPE);
            });

            describe('PAPE options', function() {

                it('should add maxAuthAge when available', function() {
                    options.pape = {
                        'maxAuthAge': 'some age'
                    };
                    var strategy = new adskStrategy(options, verifyCallback);
                    var papeRequestParams = strategy._relyingParty.extensions[0].requestParams;
                    expect(papeRequestParams['openid.pape.max_auth_age']).to.equal(options.pape.maxAuthAge);
                });

                it('should add preferredAuthPolicies when available as string', function() {
                    options.pape = {
                        'preferredAuthPolicies': 'some policy'
                    };
                    var strategy = new adskStrategy(options, verifyCallback),
                        papeRequestParams = strategy._relyingParty.extensions[0].requestParams;

                    expect(papeRequestParams['openid.pape.preferred_auth_policies']).
                        to.equal(options.pape.preferredAuthPolicies);
                });

                it('should add preferredAuthPolicies when available as an array', function() {
                    options.pape = {
                        'preferredAuthPolicies': ['some policy', 'another policy']
                    };
                    var strategy = new adskStrategy(options, verifyCallback),
                        papeRequestParams = strategy._relyingParty.extensions[0].requestParams,
                        expectedPolicies = options.pape.preferredAuthPolicies.join(' ');

                    expect(papeRequestParams['openid.pape.preferred_auth_policies']).to.equal(expectedPolicies);
                });
            });

            it('should add OAuth extension when OAuth options available', function() {
                options.oauth = {};

                var strategy = new adskStrategy(options, verifyCallback);

                expect(strategy._relyingParty.extensions[0]).to.be.instanceof(openid.OAuthHybrid);
            });

            it('should set relying Party', function() {
                var strategy = new adskStrategy(options, verifyCallback);

                expect(strategy._relyingParty).to.be.instanceof(openid.RelyingParty);
            });

        });

        describe('ADSK Open ID extensions', function() {

            it('should add Register extension when registration options available', function() {
                options.register = {};

                var strategy = new adskStrategy(options, verifyCallback);

                expect(strategy._relyingParty.extensions[0]).to.be.instanceof(adskopenid.Register);
            });

            it('should add Custom UI extension when Custom UI options available', function() {
                options.customui = {};

                var strategy = new adskStrategy(options, verifyCallback);

                expect(strategy._relyingParty.extensions[0]).to.be.instanceof(adskopenid.CustomUI);
            });

            it('should add Custom UI extension with x_ui_type=consumer when Custom UI and Register options available',
                function() {

                    options.register = {};
                    options.customui = {};

                    var strategy = new adskStrategy(options, verifyCallback);

                    expect(strategy._relyingParty.extensions[1].requestParams['openid.customui.x_ui_type']).
                        to.equal('consumer');
                });
        });
    });

    describe('authenticate', function() {
        var testRequest,
            strategy;

        beforeEach(function() {

            var options = {'returnURL': 'some URL'};

            strategy = new adskStrategy(options, verifyCallback);

            testRequest = {
                'url': 'the url',
                'query': {
                    'openid.mode': 'query mode'
                },
                'body': {
                    'openid.mode': 'body mode'
                }
            };
        });

        it('should cancel auth request when openid.mode=cancel', function(done) {

            testRequest.query['openid.mode'] = 'cancel';
            strategy.fail = function(message) {
                expect(message.message).to.equal('OpenID authentication canceled');
                done();
            };
            strategy.authenticate(testRequest);

        });

        it('should verify assertion', function() {

            var relyingPartyMock = sinon.mock(strategy._relyingParty);
            relyingPartyMock.expects('verifyAssertion').withArgs(testRequest.url);
            strategy.authenticate(testRequest);

            relyingPartyMock.verify();

        });

        it('should verify assertion with POST', function() {
            testRequest.method = 'POST';
            var relyingPartyMock = sinon.mock(strategy._relyingParty);
            relyingPartyMock.expects('verifyAssertion').withArgs('the url?openid.mode=body%20mode');
            strategy.authenticate(testRequest);

            relyingPartyMock.verify();
        });

        describe('verifyAssertionHandler', function() {

            describe('on failed authentication', function() {

                it('should throw an error on failed assertion verification', function(done) {
                    strategy.error = function(error) {
                        expect(error).to.be.instanceOf(Error);
                        expect(error.message).to.equal('Failed to verify assertion');
                        done();
                    };
                    strategy.verifyAssertionHandler('error');
                });

                it('should throw an error on failed authentication', function(done) {
                    strategy.error = function(error) {
                        expect(error).to.be.instanceOf(Error);
                        expect(error.message).to.equal('OpenID authentication failed');
                        done();
                    };
                    var mockResult = {
                            'authenticated': false
                        },
                        mockRequest = {
                            'query': {
                                'openid.mode': 'some mode'
                            }
                        };

                    strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                });

                it('should request setup on OpenId mode setup_needed', function(done) {
                    strategy.success = function(err, message) {
                        expect(message).to.equal('Login Setup Required');
                        done();
                    };

                    var mockResult = {
                            'authenticated': false
                        },
                        mockRequest = {
                            'query': {
                                'openid.mode': 'setup_needed'
                            }
                        };

                    strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                });
            });

            describe('on successful authentication', function() {

                var mockRequest,
                    mockResult;

                beforeEach(function() {
                    mockRequest = 'mock_request';
                    mockResult = {
                        'authenticated': true,
                        'claimedIdentifier': 'claimedIdentifier'
                    };
                });

                describe('with _passReqToCallback', function() {

                    beforeEach(function() {
                        strategy._passReqToCallback = true;
                    });

                    it('should respond with callback with 6 parameters', function(done) {
                        strategy._verify = function(req, claimedIdentifier, profile, pape, oauth, verified) {
                            expect(req).to.equal('mock_request');
                            expect(verified).to.be.instanceOf(Function);
                            done();
                        };

                        strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                    });

                    it('should respond with callback with 5 parameters', function(done) {
                        strategy._verify = function(req, claimedIdentifier, profile, pape, verified) {
                            expect(req).to.equal('mock_request');
                            expect(verified).to.be.instanceOf(Function);
                            done();
                        };

                        strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                    });

                    it('should respond with callback with 4 parameters', function(done) {
                        strategy._verify = function(req, claimedIdentifier, profile, verified) {
                            expect(req).to.equal('mock_request');
                            expect(verified).to.be.instanceOf(Function);
                            done();
                        };

                        strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                    });

                    it('should respond with callback with 3 parameters', function(done) {
                        strategy._verify = function(req, claimedIdentifier, verified) {
                            expect(req).to.equal('mock_request');
                            expect(verified).to.be.instanceOf(Function);
                            done();
                        };

                        strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                    });
                });

                describe('without _passReqToCallback', function() {

                    it('should respond with callback with 5 parameters', function(done) {
                        strategy._verify = function(claimedIdentifier, profile, pape, oauth, verified) {
                            expect(claimedIdentifier).to.equal('claimedIdentifier');
                            expect(verified).to.be.instanceOf(Function);
                            done();
                        };

                        strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                    });

                    it('should respond with callback with 4 parameters', function(done) {
                        strategy._verify = function(claimedIdentifier, profile, pape, verified) {
                            expect(claimedIdentifier).to.equal('claimedIdentifier');
                            expect(verified).to.be.instanceOf(Function);
                            done();
                        };

                        strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                    });

                    it('should respond with callback with 3 parameters', function(done) {
                        strategy._verify = function(claimedIdentifier, profile, verified) {
                            expect(claimedIdentifier).to.equal('claimedIdentifier');
                            expect(verified).to.be.instanceOf(Function);
                            done();
                        };

                        strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                    });

                    it('should respond with callback with 5 parameters', function(done) {
                        strategy._verify = function(claimedIdentifier, verified) {
                            expect(claimedIdentifier).to.equal('claimedIdentifier');
                            expect(verified).to.be.instanceOf(Function);
                            done();
                        };

                        strategy.verifyAssertionHandler(null, mockResult, mockRequest);
                    });

                });

            });

        });

        describe('verify helper', function() {
            it('should handle the error on error', function(done) {
                strategy.error = function(err) {
                    expect(err).to.equal('some error');
                    done();
                };

                strategy.verified('some error');
            });

            it('should fail when no user provided', function(done) {
                strategy.fail = function(info) {
                    expect(info).to.equal('some info');
                    done();
                };

                strategy.verified(null, null, 'some info');
            });

            it('should succeed when user  provided', function(done) {
                strategy.success = function(user, info) {
                    expect(user).to.equal('some user');
                    expect(info).to.equal('some info');
                    done();
                };

                strategy.verified(null, 'some user', 'some info');
            });
        });

    });

    describe('discoverOP', function() {
        var testRequest,
            strategy;

        beforeEach(function() {

            var options = {'returnURL': 'some URL'};

            strategy = new adskStrategy(options, verifyCallback);

            testRequest = {
                'url': 'the url',
                'query': {
                    'openid.mode': 'query mode'
                },
                'body': {
                    'openid.mode': 'body mode'
                }
            };
        });

        it('should validate missing OpenID identifier', function(done) {

            strategy.fail = function(message) {
                expect(message.message).to.equal('Missing OpenID identifier');
                done();
            };
            strategy.discoverOP({});
        });

        it('should authenticate with identifier from query', function() {

            strategy._identifierField = 'IDFIELD';
            testRequest.query.IDFIELD = 'open id from query';

            var relyingPartyMock = sinon.mock(strategy._relyingParty);
            relyingPartyMock.expects('authenticate').withArgs(testRequest.query.IDFIELD, false);
            strategy.discoverOP(testRequest);

            relyingPartyMock.verify();

        });

        it('should authenticate with identifier from body', function() {

            strategy._identifierField = 'IDFIELD';
            testRequest.body.IDFIELD = 'open id from body';

            var relyingPartyMock = sinon.mock(strategy._relyingParty);
            relyingPartyMock.expects('authenticate').withArgs(testRequest.body.IDFIELD, false);
            strategy.discoverOP(testRequest);

            relyingPartyMock.verify();

        });

        it('should authenticate with identifier from provider url', function() {

            strategy._providerURL = 'provider URL';

            var relyingPartyMock = sinon.mock(strategy._relyingParty);
            relyingPartyMock.expects('authenticate').withArgs(strategy._providerURL, false);
            strategy.discoverOP(testRequest);

            relyingPartyMock.verify();

        });

        it('should authenticate with immediate flag', function() {

            strategy._providerURL = 'provider URL';
            strategy.immediate = 'fake value';

            var relyingPartyMock = sinon.mock(strategy._relyingParty);
            relyingPartyMock.expects('authenticate').withArgs(strategy._providerURL, strategy.immediate);
            strategy.discoverOP(testRequest);

            relyingPartyMock.verify();

        });
    });

    describe('associations', function() {
        var strategy;

        beforeEach(function() {

            var options = {'returnURL': 'some URL'};
            strategy = new adskStrategy(options, verifyCallback);
        });

        it('should register a function used to save associations', function() {
            var expectedHandle = 'handle',
                expectedProvider = 'provider',
                expectedType = 'type',
                expectedSecret = 'secret',
                expectedExpiry = 'expiry',
                expectedCallback = 'callback';

            var fakeFn = sinon.spy();
            strategy.saveAssociation(fakeFn);

            openid.saveAssociation(expectedProvider, expectedType, expectedHandle,
                expectedSecret, expectedExpiry, expectedCallback);

            expect(fakeFn.called).to.be.true;
        });

        it('should register a function used to load associations', function(done) {

            var expectedHandle = 'handle';

            var fakeFn = function(handle, callback) {
                expect(handle).to.equal(expectedHandle);
                expect(callback).to.be.instanceOf(Function);
                done();
            };
            strategy.loadAssociation(fakeFn);

            openid.loadAssociation(expectedHandle);
        });

    });

    describe('discovered information', function() {
        var strategy;

        beforeEach(function() {

            var options = {'returnURL': 'some URL'};
            strategy = new adskStrategy(options, verifyCallback);
        });

        it('should register a function used to cache discovered info', function(done) {
            var expectedParam = 'expectedParam';

            var fakeFn = function(param) {
                expect(param).to.equal(expectedParam);
                done();
            };
            strategy.saveDiscoveredInfo(fakeFn);

            openid.saveDiscoveredInformation(expectedParam);
        });

        it('should register a function used to load discovered info from cache', function(done) {

            var expectedParam = 'expectedParam';

            var fakeFn = function(param) {
                expect(param).to.equal(expectedParam);
                done();
            };
            strategy.loadDiscoveredInfo(fakeFn);

            openid.loadDiscoveredInformation(expectedParam);
        });

    });

    describe('parsing', function() {
        var strategy;

        beforeEach(function() {

            var options = {'returnURL': 'some URL'};
            strategy = new adskStrategy(options, verifyCallback);
        });

        it('should parse user profile from OpenID response with full name', function() {
            var params = {
                'fullname': 'the full name',
                'email': 'the email',
                'lastname': 'lastname',
                'firstname': 'firstname'
            };

            var profile = strategy._parseProfileExt(params);

            expect(profile.displayName).to.equal(params.fullname);
            expect(profile.name.familyName).to.equal(params.lastname);
            expect(profile.name.givenName).to.equal(params.firstname);
            expect(profile.emails[0].value).to.equal(params.email);
        });

        it('should parse user profile from OpenID response w/o full name', function() {
            var params = {
                'email': 'the email',
                'lastname': 'lastname',
                'firstname': 'firstname'
            };

            var profile = strategy._parseProfileExt(params);

            expect(profile.displayName).to.equal(params.firstname + ' ' + params.lastname);
            expect(profile.name.familyName).to.equal(params.lastname);
            expect(profile.name.givenName).to.equal(params.firstname);
            expect(profile.emails[0].value).to.equal(params.email);
        });

        it('should  parse user PAPE from OpenID response', function() {
            var params = {};

            var result = strategy._parsePAPEExt(params);

            expect(result).to.truthy;
        });

        it('should  parse user PAPE from OpenID response with params', function() {
            var params = {
                'auth_policies': 'auth_policies',
                'auth_time': '5/4/1950'
            };

            var result = strategy._parsePAPEExt(params);

            expect(result.authPolicies[0]).to.equal('auth_policies');
            expect(result.authTime).to.be.instanceOf(Date);

        });

        it('should  parse OpenID from OpenID response', function() {

            var params = {};

            var result = strategy._parseOAuthExt(params);

            expect(result).to.truthy;
        });

        it('should  parse OpenID from OpenID response with params', function() {

            var params = {
                'request_token': 'request_token'
            };

            var result = strategy._parseOAuthExt(params);

            expect(result.requestToken).to.equal('request_token');
        });
    });

});
