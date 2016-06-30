'use strict';
var auth = require('./auth'),
    querystring = require('querystring'),
    config = require('config'),
    openidConfig = config.openidConfig,
    sessionAuth = require('../auth/auth.js'),
    adskpassport = exports;

var logger = require('../utils/logger.js');

adskpassport.init = function(options) {
    // Use the PassportOpenId Strategy within Passport. We will change this and implement
    // our own passport strategy for Autodesk
    //   Strategies in Passport require a `verify` function, which accept
    //   credentials, and invoke a callback with a user object.
    auth.services.passport.use(new auth.services.strategy(options, function(identifier, ui, profile, user, done) {
            // This is verification call back. In our case, all the user validation
            // after login was done already at oxygen side.
            done(null, user);
        }
    ));
};

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, in our case, we do not
//   have a database of user records on the client side to save/find users.
auth.services.passport.serializeUser(function(user, done) {

    done(null, user);
});
// MD TODO this seems to be broken and not used since users is not defined
//auth.services.passport.deserializeUser(function(id, done) {
//
//    var user = _.find(users, {id: id});
//
//    if (user) {
//        done(null, user);
//    } else {
//        done(new Error('no such user'));
//    }
//
//});

adskpassport.verifyAuthentication = function(req, res, next) {

    var options = auth.verifylogin('');

    if (!req.query['openid.mode']) {
        options = auth.verifylogin(querystring.stringify(req.query));
    }

    adskpassport.init(options);
    auth.services.passport.authenticate('openid',
        function(err, user, info) {
            if (err) {
                next(err);
            }

            if (!user) {
                next();
            }

            if (user) {
                next();
            }
        }
    )(req, res, next);
};

adskpassport.login = function(req, res, next) {
    adskpassport.init(auth.login);
    auth.services.passport.authenticate('openid',
        function(err) {
            if (err) {
                return next(err);
            }
        })(req, res, next);
};

adskpassport.register = function(req, res, next) {
    adskpassport.init(auth.register);
    auth.services.passport.authenticate('openid',
        function(err) {
            if (err) {
                return next(err);
            }
        })(req, res, next);
};

adskpassport.logout = function(req, res, next) {
    res.writeHead(302, {
        'Location': openidConfig.providerUrl + '/Authentication/Logout?ReturnToUrl=' +
                    config.siteServiceLayerUrl + '/auth/openid/login'
    });
    res.end();
};

adskpassport.successHandler = function(req, res, next) {
    adskpassport.init(auth.successHandler);
    auth.services.passport.authenticate('openid',
        function(err, user, info) {
            if (err) {
                return next(err);
            }

            req.logIn(user, function(err) {
                    if (err) {
                        return next(err);
                    }
                    var response = {};
                    var userExtKey = req.query['openid.alias3.value.alias6'] || req.body['openid.alias3.value.alias6'];

                    sessionAuth.generateSessionObj(userExtKey, function(err, params) {

                        // user profile parameters
                        response.uid = userExtKey;
                        response.email = req.query['openid.alias3.value.alias4'] ||
                                        req.body['openid.alias3.value.alias4'];
                        response.guid = req.query['openid.alias3.value.alias5'] ||
                                        req.body['openid.alias3.value.alias5'];

                        // security tokens
                        response.gt = params.grantToken;
                        response.st = params.sessionId;

                        //OptIn option for analytics.
                        response.optIn = req.query['openid.alias3.value.alias7'] ||
                                            req.body['openid.alias3.value.alias7'];

                        // event identifier which will be used by the client side window listener
                        response.event = 'signin';

                        var head = {'Content-Type': 'text/html; charset=UTF-8'};
                        res.writeHead(200, head);
                        var str = '<script' + ' type=\'text/javascript\'>';
                        str = str + ' var responseJson = ';
                        str = str + '{';
                        str = str + 'uid:' + '\'' + response.uid + '\',';
                        str = str + 'email:' + '\'' + response.email + '\',';
                        str = str + 'guid:' + '\'' + response.guid + '\',';
                        str = str + 'gt:' + '\'' + response.gt + '\',';
                        str = str + 'st:' + '\'' + response.st + '\',';
                        str = str + 'event:' + '\'' + response.event + '\',';
                        str = str + 'OptIn:' + '\'' + response.optIn + '\'';
                        str = str + '};';
                        str = str + 'window.parent.postMessage(JSON.stringify(responseJson),\'' +
                                    config.siteFrontEndUrl + '\');';
                        str = str + '</script' + '>';

                        res.write(str);
                        res.send();
                    });
                }
            );
        })(req, res, next);
};

adskpassport.handleOpenIdErrors = function(err, req, res, next) {

    if (typeof req._passport === 'undefined') {
        next();
    }

    var response = {};
    response.event = 'error';

    // log the error message into the log file.
    // we need the passport information for trouble shooting the issue when the error occurs.
    logger.error(req, res, err.code, err.message);

    var head = {'Content-Type': 'text/html; charset=UTF-8'};
    res.writeHead(500, head);

    // pass on this information to the client. client will decide where to navigate.
    var str = '<script' + ' type=\'text/javascript\'>';
    str = str + ' var responseJson = ';
    str = str + '{';
    str = str + 'event:' + '\'' + response.event + '\'';
    str = str + '};';
    str = str + 'window.parent.postMessage(JSON.stringify(responseJson),\'' + config.siteFrontEndUrl + '\');';
    str = str + '</script' + '>';

    res.write(str);
    res.send();
};
