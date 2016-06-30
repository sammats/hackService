'use strict';

var basicAuth = require('basic-auth');
var logger = require('../utils/logger.js');
var sessionConfig = require('config').sessionConfig;
var cache = require('../utils/cache.js');
var uuid = require('uuid');
var utils = require('../utils/util.js');

/*
 *  The function generate Session Object (key, value). The key is the sessionId (uuid generated random hashcode e.g:241c7abc-c58c-488f-8c39-2c231f0d9ddd)
 *  whereas the value is - <userExtKey> : <grantToken> : <timestamp>. Here the garantToken is similar to sessionId (uuid generated random hashcode e.g:4eccd5e1-4c3a-43fc-b2aa-54dd91e2b8d7)
 *  This method is invoked from redirect service (lib/v1/redirect.js) to generate this key, value pair and pass it on to IPP UI
 *  @param {String} userExtKey - userExtKey String
 *  @return {JSON Object} sessionParams - JSON Object which consist of sessionId and grantToken parameters
 */
exports.generateSessionObj = function(userExtKey, callback) {
    cache.getClient(function(err, client) {
        if (err) {
            return callback(err);
        }

        var sessionParams = {};
        var sessionId = uuid.v4();
        var grantToken = uuid.v4();
        client.psetex(sessionId, sessionConfig.sessionTtl, userExtKey + ':' + grantToken + ':' + new Date().getTime());
        logger.debug('Session Key is generated');
        sessionParams.sessionId = sessionId;
        sessionParams.grantToken = grantToken;
        return callback(null, sessionParams);
    });
};

/*
 *  The function refresh with new grantToken for existing SessionId Key The key is the sessionId (uuid generated random hashcode e.g:241c7abc-c58c-488f-8c39-2c231f0d9ddd)
 *  whereas the value is - <userExtKey> : <New grantToken> : <timestamp>. Here the garantToken is similar to sessionId (uuid generated random hashcode e.g:4eccd5e1-4c3a-43fc-b2aa-54dd91e2b8d7)
 *  This method is invoked as a Service to IPP UI, which regenerate the grantToken for existing valid SessionId key.
 *  @param {String} sessionId - sessionId String
 *  @param {String} userExtKey - userExtKey String
 *  @param {Object} callback - callback Object
 *  @return {JSON Object} grantParams - JSON Object which consist of grantToken parameter
 */
exports.refreshGrantTokenForSessionId = function(sessionId, userExtKey, callback) {
    cache.getClient(function(err, client) {
        if (err) {
            return callback(err);
        }

        var grantParams = {};
        var grantToken = uuid.v4();
        client.psetex(sessionId, sessionConfig.sessionTtl, userExtKey + ':' + grantToken + ':' + new Date().getTime());
        logger.debug('New Grant Token is generated for Existing SessionId');
        logger.debug('GrantToken refreshed with the value==' + grantToken);
        grantParams.grantToken = grantToken;
        return callback(null, grantParams);
    });
};

/*
 This functions validates a session, validating its session id, grantToken, the grantToken timestamp and the userId.
 */
exports.validateSessionWithTimestamp = function(req, res, next) {
    authorizeSession(req, res, next, true, true);
};

/*
 This functions validates a session, validating its session id, grantToken and the userId, but without validating the grantToken timestamp .
 */
exports.validateSessionWithoutTimestamp = function(req, res, next) {
    authorizeSession(req, res, next, true, false);
};

/*
 This functions validates a session, validating its session id, grantToken and the grantToken timestamp, bit without validating the userId.
 */
exports.validateSessionWithoutUserId = function(req, res, next) {
    authorizeSession(req, res, next, false, true);
};

exports.validateSession = validateSession;

/*
 This functions validates the session based on the parameters received, returning a response based on the authorization.
 */
function authorizeSession(req, res, next, checkUserExtKey, checkTimestamp) {
    var apiUser = basicAuth(req);

    if (!apiUser || !apiUser.name || !apiUser.pass) {
        logger.debug('401 Unauthorized');
        return sendResponse(res, sessionConfig.statusUnauthorized, {});
    } else {
        req.headers.sessionid = apiUser.name;
        req.headers.granttoken = apiUser.pass;
        logger.debug('req.headers.sessionid===' + req.headers.sessionid);
        logger.debug('req.headers.granttoken===' + req.headers.granttoken);
        validateSession(req.headers.sessionid, req.headers.granttoken, getUserId(req), checkUserExtKey, checkTimestamp,
            function(err, result) {
            if (err) {
                logger.debug('Error when validating session: ' + err.message);
                return sendResponse(res, 500, {});
            }
            if (result === sessionConfig.statusUnauthorized || result === sessionConfig.statusGrantTokenExpired) {
                logger.debug('Session Expired / GrantToken Expired.');
                return sendResponse(res, result, {});
            }
            next();
        });
    }
}

function getUserId(req) {
    return req.param('userExtKey') || req.param('userId') || null;
}

function sendResponse(res, status, json) {
    return res.status(status).send(json);
}

/*
 This functions validates the session based on the parameters received, checking at least the sessionId and the grantToken.
 If "checkUserExtKey" parameter is true, it will also check the "userExtKey" received.
 If "checkTimestamp" is true, it will also check if the token TTL is greater than the max grantToken TTL
 */
function validateSession(sessionId, grantToken, userExtKey, checkUserExtKey, checkTimestamp, callback) {
    cache.getClient(function(err, client) {
        if (err) {
            return callback(err);
        }
        client.get(sessionId, function(err, iValue) {
            if (err) {
                return callback(err);
            }
            // logger.debug('iValue===='+iValue);
            if (!iValue) {
                logger.debug('No sessionId value found for session ' + sessionId);
                return callback(null, sessionConfig.statusUnauthorized);
            }

            var iArray = iValue.split(':');

            if ((iArray[1] !== grantToken) ||
                (checkUserExtKey && (iArray[0] !== userExtKey))) {
                return callback(null, sessionConfig.statusUnauthorized);
            }

            client.psetex(sessionId, sessionConfig.sessionTtl, iValue);

            //logger.debug('Reset TTL for SessionId');
            //logger.debug('iArray[2] == '+iArray[2]);

            if (checkTimestamp && ((new Date().getTime()) - iArray[2] > sessionConfig.grantTokenTtl)) {
                return callback(null, sessionConfig.statusGrantTokenExpired);
            } else {
                return callback(null, sessionConfig.statusOK);
            }
        });
    });
}
