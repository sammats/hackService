'use strict';
var express = require('express'),
    router = express.Router(),
    refreshToken = require('../../../lib/v1/refreshtoken.js'),
    handleRequest = require('../../../lib/utils/response.js').handleRequest,
    auth = require('../../../lib/auth/auth.js'),
    _ld = require('lodash-node'),
    corsConfig = require('config');

// TEMP added CORS headers for dev
router.all('*', function(req, res, next) {

    if (_ld.has(corsConfig, 'corsEnabled')) {
        res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

router.options('*', function(req, res, next) {
    res.status(200).end();
    next();
});

/**
 * @api {get} /services/v1/token Refreshes a valid token
 * @apiName refreshToken
 * @apiGroup Token
 *
 * * @apiDescription
 Refreshes a valid token.
 *
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/token?userExtKey=F8PKPV9NJBPT
 *
 * @apiParam {String} userExtKey The user id from Oxygen.

 * @apiSuccessExample Success-Response
 {
    "grantToken": "55bcb01e-ac7b-4476-ac84-e5d02614c494"
}
 */
router.get('/', auth.validateSessionWithoutTimestamp, handleRequest.bind(refreshToken, 'refreshGrantToken'));

module.exports = router;
