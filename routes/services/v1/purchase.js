'use strict';
var express = require('express'),
    router = express.Router(),
    purchase = require('../../../lib/v1/purchase.js'),
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
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

router.options('*', function(req, res, next) {
    res.status(200).end();
    next();
});

/**
 * @api {post} /services/v1/purchase Make a purchase on Payport
 * @apiName doPurchase
 * @apiGroup Purchase

 * @apiDescription
 * This function makes a purchase on BlueSnap through PayPort.
 * It receives a body with the parameters that PayPort.purchase receives but not receiving the following parameters: webInfo (and inside parameters) and user.ip.
 * The webInfo information and the user.ip will be generated based on request information.
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/purchase?userExtKey=TestOxygenID

 * @apiExample Request Body Example:
 *  {
 *   "purchase": {
 *     "user": {
 *       "paymentProfile": {
 *         "creditCardInfo": {
 *           "last4Digits": "1111",
 *           "cardType": "VISA"
 *         }
 *       }
 *     },
 *     "offers": [
 *       {
 *         "externalKey": "FSN360-BASE-M",
 *         "amount": "40",
 *         "taxCode": "SW052000"
 *       }
 *     ],
 *     "currency": "USD",
 *     "shippingMethod":{
 *         "id": "1234",
 *         "amount": "12.90"
 *     }
 *   }
 * }

 * @apiParam {String} grantToken The authentication token.
 * @apiParam {String} userExtKey The user id from PayPort.
 * @apiParam {JSON} body The purchase body on a JSON format.


 * @apiSuccessExample Success-Response
 {
    "purchaseOrder":{
       "id":"705",
       "userId":"1189",
       "state":"CHARGED",
       "fulfillmentStatus":"FULFILLED",
       "amountCharged":"40.00",
       "currency":"USD",
       "properties":{
          "bluesnapInvoiceId":"1008796944",
          "bluesnapOrderId":"3941039"
       }
    }
 }
 */
router.post('/', auth.validateSessionWithTimestamp, setJson.bind(purchase, 'doOnsitePurchase'));
router.post('/offsite', auth.validateSessionWithTimestamp, setJson.bind(purchase, 'getOffsitePurchaseUrl'));

module.exports = router;
