'use strict';
var express = require('express'),
    store = require('../../../lib/v1/store.js'),
    setJson = require('../../../lib/utils/response.js').setJson,
    router = express.Router(),
    corsConfig = require('config'),
    frontEndUrl = corsConfig.siteFrontEndUrl,
    _ld = require('lodash-node');

router.use('*', function(req, res, next) {

    if (_ld.has(corsConfig, 'corsEnabled')) {
        res.header('Access-Control-Allow-Origin', frontEndUrl);
    }
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,Authorization');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

/**
 * @api {get} /services/v1/store/:externalStoreKey Get Store from Pelican
 * @apiName getStore
 * @apiGroup Store
 *
 * * @apiDescription
 * Finds a store defined in Pelican based on external store key.
 *
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/store/STO-NAMER
 *
 * * @apiParam {String} extStoreKey external store key as defined in Pelican

 * @apiSuccessExample Success-Response
 {
  "data": {
    "type": "store",
    "id": "1823",
    "externalKey": "STO-NAMER",
    "name": "Store North America",
    "storeType": "STORE",
    "properties": null,
    "countries": [
      {
        "country": "CA",
        "links": {
          "priceList": {
            "type": "priceList",
            "id": "1001"
          },
          "shippingMethods": {
            "type": "shippingMethod",
            "ids": [
              "45846"
            ]
          }
        },
        "type": "country",
        "id": "US"
      }
    ],
    "links": {
      "priceLists": {
        "type": "priceList",
        "ids": [
          1001
        ]
      }
    }
  },
  "included": [
    {
      "type": "priceList",
      "id": "1001",
      "externalKey": "BIC_NAMER_USD",
      "currency": "USD",
      "name": "Store NAMER USD"
    },
    {
      "type": "shippingMethod",
      "id": "38436",
      "price": {
        "currency": "USD",
        "amount": "127.99"
      },
      "descriptors": {
        "name": "UPS Worldwide Saver",
        "deliveryTime": "2-4 Business Days"
      },
      "destinations": [
        {
          "country": "CA"
        }
      ]
    }
  ],
  "errors": null
}
 */
router.get('/:extStoreKey', setJson.bind(store, 'getStore'));

module.exports = router;

