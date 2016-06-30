'use strict';
var express = require('express'),
    router = express.Router(),
    tax = require('../../../lib/v1/tax.js'),
    json = require('../../../lib/utils/response.js').setJson,
    auth = require('../../../lib/auth/auth.js'),
    _ld = require('lodash-node'),
    corsConfig = require('config');

// TEMP added CORS headers for dev
router.all('*', function(req, res, next) {
    if (_ld.has(corsConfig, 'corsEnabled')) {
        res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

router.options('*', function(req, res, next) {
    res.status(200).end();
    next();
});

/**
 * @api {post} /services/v1/tax Get Taxes from PayPort
 * @apiName getTaxes
 * @apiGroup Tax

 * @apiDescription
 * Makes a post for getTaxes on Payport with the request.body received and returning the same information that Payport returns.
 * More information on the 'getTaxes' method of the Payport documentation.
 *
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/tax?grantToken=abcd

 * @apiExample
 {
  "tax": {
    "offers": [
      {
        "externalKey": "FSN360-BASE-M",
        "amount": "40",
        "taxCode": "SW052000"
      }
    ],
    "billingInfo": {
      "streetAddress": "1 Main St",
      "city": "San Francisco",
      "stateProvince": "CA",
      "country": "US",
      "postalCode": "94501"
    },
    "currency": "USD",
    "shippingMethod":{
        "id": "1234",
        "amount": "12.90"
    }
  }
}

 * @apiParam {String} grantToken The authentication token.

 * @apiSuccessExample Success-Response
 {
   "cart":{
      "subtotal":40,
      "tax":0,
      "needsTaxAmounts":true,
      "currency":"USD",
      "offers":[
         {
            "name":"offer",
            "externalKey":"FSN360-BASE-M",
            "type":"SUBSCRIPTION",
            "amount":"40",
            "taxCode":"SW052000",
            "taxAmount":"0.0",
            "skuId":"2151074",
            "quantity":"1"
         }
      ],
      "subscriptions":[

      ],
      "total":40
   }
}


 */
router.post('/', auth.validateSessionWithoutUserId, json.bind(tax, 'getTaxes'));

module.exports = router;
