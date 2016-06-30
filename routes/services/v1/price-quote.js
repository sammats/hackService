'use strict';
var express = require('express'),
    priceQuote = require('../../../lib/v1/price-quote.js'),
    setJson = require('../../../lib/utils/response.js').setJson,
    router = express.Router(),
    corsConfig = require('config'),
    _ = require('lodash');

router.use('*', function (req, res, next) {

    if(_.has(corsConfig, 'corsEnabled')){
        res.header('Access-Control-Allow-Origin', '*');
    }

    res.header('Access-Control-Allow-Headers', 'X-Requested-With,Authorization,Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

/**
 * @api {get} /services/v1/priceQuote
 * @apiName getPriceQuote
 * @apiGroup priceQuote
 *
 * * @apiDescription
 * Returns priceQuote information, given a userId, lineItems, and shipping information
 *
 *
 * Sample Request: http://cart2-dev.aws.autodesk.com/services/v1/priceQuote
 *
 * * @apiParam {String} userId the external user identifier
 * * @apiParam {String} lineItems  products line items
 * * @apiParam {String} shipping  shipping information

 * @apiSuccessExample Success-Response
 {
    totals: {
        currency: "USD"
        subtotal: "50.00"
        taxes: "20.00"
        shipping: "12.61"
        total: "82.61"
    }
 }
 */

router.post('/', setJson.bind(priceQuote, 'getPriceQuote'));

module.exports = router;

