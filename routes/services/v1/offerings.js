'use strict';
var express = require('express'),
    offerings = require('../../../lib/v1/offerings.js'),
    setJson = require('../../../lib/utils/response.js').setJson,
    router = express.Router(),
    corsConfig = require('config'),
    _ = require('lodash');

router.use('*', function (req, res, next) {

    if(_.has(corsConfig, 'corsEnabled')){
        res.header('Access-Control-Allow-Origin', '*');
    }

    res.header('Access-Control-Allow-Headers', 'X-Requested-With,Authorization');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

/**
 * @api {get} /services/v1/offerings?store=extStoreKey&productline=productline&country=country Offering information from Pelican
 * @apiName getOfferings
 * @apiGroup Offerings
 *
 * * @apiDescription
 * Returns offering information based on a productLine, Country, Store type and Store Id
 *
 *
 * Sample Request: http://cart2-dev.aws.autodesk.com/services/v1/offerings?store=STO-NAMER&productLine=MAYALT&country=US
 *
 * * @apiParam {String} store external store key as defined in Pelican
 * * @apiParam {String} productLine  the product line identifier
 * * @apiParam {String} country  the two character country code

 * @apiSuccessExample Success-Response
{
    "items"
:
    {
        "BIC_SUBSCRIPTION"
    :
        [{
            "type": "BIC_SUBSCRIPTION",
            "id": "1015",
            "externalKey": "MAYALT-ADV",
            "productLine": "MAYALT",
            "name": "Maya LT with Advanced Support",
            "usageType": "COM",
            "supportLevel": "ADVANCED",
            "platform": "MockPlatform",
            "languages": ["en"],
            "offeringDetail": {"name": "Desktop Subscription", "externalKey": "DESK-SUBS", "taxCode": "DC020500"},
            "billingPlans": [{
                "billingPeriod": "MONTH",
                "billingPeriodCount": 1,
                "billingCycleCount": null,
                "price": {"priceId": "1890", "amount": "440.00", "currency": "USD"}
            }, {
                "billingPeriod": "YEAR",
                "billingPeriodCount": 1,
                "billingCycleCount": null,
                "price": {"priceId": "1893", "amount": "640.00", "currency": "USD"}
            }]
        }, {
            "type": "BIC_SUBSCRIPTION",
            "id": "1185",
            "externalKey": "MAYALT-TRIAL-PL2",
            "productLine": "MAYALT",
            "name": "MAYALT Trial PL2",
            "usageType": "TRL",
            "supportLevel": null,
            "platform": "MockPlatform",
            "languages": ["en"],
            "offeringDetail": {},
            "billingPlans": [{
                "billingPeriod": "MONTH",
                "billingPeriodCount": 1,
                "billingCycleCount": null,
                "price": {"priceId": "1844", "amount": "35.00", "currency": "USD"}
            }]
        }], "META_SUBSCRIPTION"
    :
        [{
            "type": "META_SUBSCRIPTION",
            "id": "1183",
            "externalKey": "TEST-MON-4",
            "productLine": "MAYALT",
            "name": "TEST-MON-4",
            "usageType": "COM",
            "supportLevel": null,
            "platform": "MockPlatform",
            "languages": ["en"],
            "offeringDetail": {},
            "billingPlans": [{
                "billingPeriod": "MONTH",
                "billingPeriodCount": 1,
                "billingCycleCount": null,
                "price": {"priceId": "1839", "amount": "110.00", "currency": "USD"}
            }]
        }, {
            "type": "META_SUBSCRIPTION",
            "id": "1004",
            "externalKey": "MAYALT-BASIC",
            "productLine": "MAYALT",
            "name": "Maya LT with Basic Support",
            "usageType": "COM",
            "supportLevel": null,
            "platform": "MockPlatform",
            "languages": ["en"],
            "offeringDetail": {"name": "Desktop Subscription", "externalKey": "DESK-SUBS", "taxCode": "DC020500"},
            "billingPlans": [{
                "billingPeriod": "YEAR",
                "billingPeriodCount": 1,
                "billingCycleCount": null,
                "price": {"priceId": "1904", "amount": "99.00", "currency": "USD"}
            }]
        }]
    }
}
 */

router.get('/', setJson.bind(offerings, 'getOfferingsByProductLine'));

module.exports = router;

