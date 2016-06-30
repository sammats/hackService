'use strict';
var express = require('express'),
    router = express.Router(),
    cloudcredits = require('../../../lib/v1/cloudcredits.js'),
    json = require('../../../lib/utils/response.js').setJson,
    auth = require('../../../lib/auth/auth.js'),
    _ld = require('lodash-node'),
    corsConfig = require('config');

// TEMP added CORS headers for dev
router.all('*', function(req, res, next) {

    if (_ld.has(corsConfig, 'corsEnabled')) {
        res.header('Access-Control-Allow-Origin', '*');
    }

    res.header('Access-Control-Allow-Headers', 'X-Requested-With,Authorization');
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

/**
 * @api {get} /services/v1/cloudcredits Get Cloud Credits from Pelican
 * @apiName getCloudCredits
 * @apiGroup Cloud Credits
 *
 * * @apiDescription
 * Finds cloud credits based on a currency and status.
 *
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/cloudcredits?currency=USD&status=ACTIVE
 *
 * * @apiParam {String} currency The currency of the cloud credit (If no currency is passed, the default is USD).
 * * @apiParam {String} status The state of the cloud credit (Valid states: NEW,ACTIVE,CANCELLED)(If no state is passed, the default is ACTIVE).

 * @apiSuccessExample Success-Response
 {
   "name":"Cloud Credits",
   "units":"100",
   "description":"Autodesk has cloud services that can make your work even more awesome. Buy these credits so that you can use it against those services",
   "externalKey":"CREDITPACKAGE",
   "price":{
      "currencycode":"USD",
      "amount":"100.00",
      "taxcode":"SW052000",
      "taxType":"CURRENCY"
   }
}
 */
router.get('/', auth.validateSessionWithoutUserId, json.bind(cloudcredits, 'getCloudCredits'));

module.exports = router;
