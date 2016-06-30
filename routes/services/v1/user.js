'use strict';
var express = require('express'),
    router = express.Router(),
    user = require('../../../lib/v1/user.js'),
    json = require('../../../lib/utils/response.js').json,
    setJson = require('../../../lib/utils/response.js').setJson,
    auth = require('../../../lib/auth/auth.js'),
    _ld = require('lodash-node'),
    corsConfig = require('config');

// TEMP added CORS headers for dev
router.all('*', function(req, res, next) {
    if (_ld.has(corsConfig, 'corsEnabled')) {
        res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

router.options('*', function(req, res, next) {
    res.status(200).end();
    next();
});

/**
 * @api {get} /services/v1/user/:extKey Get User By External Key
 * @apiName getByExternalKey
 * @apiGroup User
 */
router.get('/:extKey', auth.validateSessionWithTimestamp, json.bind(user, 'getByExternalKey'));

/**
 * @api {get} /services/v1/user/:extKey/subscriptions Get User Subscriptions
 * @apiName getActiveSubscriptions
 * @apiGroup User
 */
router.get('/:extKey/subscriptions', auth.validateSessionWithTimestamp, json.bind(user, 'getActiveSubscriptions'));

/**
 * @api {get} /services/v1/user/:extKey/upgrade Get User Upgrades
 * @apiName getUpgrades
 * @apiGroup User
 */
router.get('/:extKey/upgrade', auth.validateSessionWithTimestamp, json.bind(user, 'getUpgrades'));

/**
 * @api {get} /services/v1/user/:extKey/catalog/:subId Get User Catalog
 * @apiName getCatalog
 * @apiGroup User
 */
router.get('/:extKey/catalog/:subId', auth.validateSessionWithTimestamp, json.bind(user, 'getCatalog'));

module.exports = router;
