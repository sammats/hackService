'use strict';
var express = require('express'),
    router = express.Router(),
    initializer = require('../../../lib/v1/initializer.js'),
    json = require('../../../lib/utils/response.js').json,
    auth = require('../../../lib/auth/auth.js'),
    _ld = require('lodash-node'),
    corsConfig = require('config');

// TEMP added CORS headers for dev
router.all('*', function(req, res, next) {
    //console.log(corsConfig);

    if (_ld.has(corsConfig, 'corsEnabled')) {
        res.header('Access-Control-Allow-Origin', '*');
    }

    res.header('Access-Control-Allow-Headers', 'Content-Type,Accept');
    res.header('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With,Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT');
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

/**
 * @api {get} /services/v1/initializer IPP Initializer
 * @apiName initializer
 * @apiGroup Initializer
 *
 * @apiDescription
 This is a REST API which GETs, catalog data (from PELICAN), user profile (from OXYGEN) and billing profiles (from UCM).

 Sample Request:
 https://ipp-dev.aws.autodesk.com/services/v1/initializer?userId=F8PKPV9NJBPT&country=US&offeringId=FSN360-TRIAL

 @apiParam {String} userId This is the OXYGEN ID (We get it from CLIC in the REDIRECT API call).
 @apiParam {String} country Country Code (2 chars)
 @apiParam {String} offeringId Not required if subId is present, If both are present, subId takes the precedence
 @apiParam {String} subId Not required if offeringId is present, If both are present, subId takes the precedence

 * @apiSuccessExample When the call is successful: Response Status Code:200
 [
 {
     "user": {
         "email": "nonusdev@ssttest.net",
 "country": "US",
 "paymentProfiles": [],
 "product": {
                "displayname": "Autodesk® Fusion 360",
                "imagesm": "http://static-dc.autodesk.net/content/dam/autodesk/www/products/fusion-360/images/badges/fusion-360-2014-badge-75x75.png/_jcr_content/renditions/fusion-360-2014-badge-60x60.png"
            },
 "editions": [
 {
     "name": "Base",
     "shortDecsription": "Create 3D CAD models with one easy-to-use, integrated cloud-based tool for product design.",
     "longDescription": "Create 3D CAD models with one easy-to-use, integrated cloud-based tool for product design.",
     "productImageSmall": "http://static-dc.autodesk.net/content/dam/autodesk/www/products/fusion-360/images/badges/fusion-360-2014-badge-75x75.png/_jcr_content/renditions/fusion-360-2014-badge-60x60.png",
     "subscriptionInfo": "",
     "plans": [
         {
             "productId": "FSN360-BASE-M",
             "price": [
                 {
                     "currencyCode": "USD",
                     "amount": "40.00",
                     "taxcode": "DC020500",
                     "taxtype": "SUBSCRIPTION"
                 }
             ],
             "title": "Monthly"
         },
         {
             "productId": "FSN360-BASE-A",
             "price": [
                 {
                     "currencyCode": "USD",
                     "amount": "330.00",
                     "taxcode": "DC020500",
                     "taxtype": "SUBSCRIPTION"
                 }
             ],
             "title": "Annual"
         }
     ]
 },
 {
     "name": "Professional",
     "shortDecsription": "Base product + advanced tools to provide enhanced attributes to your product design",
     "longDescription": "Base product with added tools to provide enhanced attributes to you product design",
     "productImageSmall": "http://static-dc.autodesk.net/content/dam/autodesk/www/products/fusion-360/images/badges/fusion-360-2014-badge-75x75.png/_jcr_content/renditions/fusion-360-2014-badge-60x60.png",
     "subscriptionInfo": "",
     "plans": [
         {
             "productId": "FSN360-A-PRO",
             "price": [
                 {
                     "currencyCode": "USD",
                     "amount": "900.00",
                     "taxcode": "DC020500",
                     "taxtype": "SUBSCRIPTION"
                 }
             ],
             "title": "Annual"
         },
         {
             "productId": "FSN360-M-PRO",
             "price": [
                 {
                     "currencyCode": "USD",
                     "amount": "180.00",
                     "taxcode": "DC020500",
                     "taxtype": "SUBSCRIPTION"
                 }
             ],
             "title": "Monthly"
         }
     ]
 },
 {
     "name": "Ultimate",
     "shortDecsription": "Pro product + ultimate tools to provide enhanced attributes to your product design",
     "longDescription": "Pro product + ultimate tools to provide enhanced attributes to your product design",
     "productImageSmall": "http://static-dc.autodesk.net/content/dam/autodesk/www/products/fusion-360/images/badges/fusion-360-2014-badge-75x75.png/_jcr_content/renditions/fusion-360-2014-badge-60x60.png",
     "subscriptionInfo": "",
     "plans": [
         {
             "productId": "FSN360-A-ULT",
             "price": [
                 {
                     "currencyCode": "USD",
                     "amount": "1100.00",
                     "taxcode": "DC020500",
                     "taxtype": "SUBSCRIPTION"
                 }
             ],
             "title": "Annual"
         },
         {
             "productId": "FSN360-M-ULT",
             "price": [
                 {
                     "currencyCode": "USD",
                     "amount": "200.00",
                     "taxcode": "DC020500",
                     "taxtype": "SUBSCRIPTION"
                 }
             ],
             "title": "Monthly"
         }
     ]
 }
 ],
 "noncommercial": [],
 "addons": [],
 "creditpackages": []
 }
 }
 ]

 * @apiSuccessExample When the call to PELICAN fails: Response Status Code:200
 {
 "error": {
 "code": "100",
 "message": "Generic Error: API ERROR: {\"code\":\"2\",\"message\":\"Subscription not found for ID: 2222\",\"uuid\":\"20fa6ca1-43f5-45dd-bfbe-a1b91498d5b0\"}"
 }
 * @apiSuccessExample When the call to PELICAN fails: Response Status Code:200
 }
 Sample Response: When the call to OXYGEN fails: Response Status Code:200
 {
 "error": {
 "code": "100",
 "message": "Generic Error: Oxygen call failed."
 }
 }

 */
router.get('/', auth.validateSessionWithTimestamp, json.bind(initializer, 'getInitialData'));

module.exports = router;
