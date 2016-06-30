'use strict';
var express = require('express'),
    router = express.Router(),
    product = require('../../../lib/v1/product.js'),
    service = require('../../../lib/v1/estore.js'),
    _ld = require('lodash-node'),
    corsConfig = require('config');

/*
 * Allow Cross Domain, needed for local host
 * Eventually this should be a middleware that gets
 * set if a flag in config file is TRUE, need A-Mart master to make that change
 */
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
 * @api {get} /services/v1/product/creditPackages Get Credits Packages from Pelican
 * @apiName getCreditPackages
 * @apiGroup Product
 *
 * * @apiDescription
 * Get Credits Packages from Pelican.
 *
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/product/creditPackages
 *
 * @apiSuccessExample Success-Response
 {
    "creditPackages": {
        "CAD": {
            "name": "Cloud Credits",
            "externalKey": "CREDITPACKAGE_CA",
            "units": "100",
            "description": "Autodesk CANADA",
            "taxCode": "SW052000",
            "price": {
                "currencyCode": "CAD",
                "amount": "105.00"
            }
        },
        "USD": {
            "name": "Cloud Credits",
            "externalKey": "CREDITPACKAGE",
            "units": "100",
            "description": "Autodesk has cloud services that can make your work even more awesome. Buy these credits so that you can use it against those services",
            "taxCode": "SW052000",
            "price": {
                "currencyCode": "USD",
                "amount": "100.00"
            }
        }
    }
}
 */
router.get('/creditPackages', service.handleRequest.bind(product, product.getCreditPackages));

/**
 * @api {get} /services/v1/product/creditPackages/:currencyCode Get Credits Packages from Pelican
 * @apiName getCreditPackagesByCurrency
 * @apiGroup Product
 *
 * * @apiDescription
 * Get Credits Packages by currencyCode from Pelican.
 *
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/product/creditPackages/USD
 *
 * @apiSuccessExample Success-Response
 {
    "creditPackages": {
        "USD": {
            "name": "Cloud Credits",
            "externalKey": "CREDITPACKAGE",
            "units": "100",
            "description": "Autodesk has cloud services that can make your work even more awesome. Buy these credits so that you can use it against those services",
            "taxCode": "SW052000",
            "price": {
                "currencyCode": "USD",
                "amount": "100.00"
            }
        }
    }
}
 */
router.get('/creditPackages/:currencyCode', service.handleRequest.bind(product, product.getCreditPackagesByCurrency));

/**
 * @api {get} /services/v1/product/edition/plan/:planExtKey Get Edition By Plan Ext Key
 * @apiName getEditionByPlanExtKey
 * @apiGroup Product
 *
 * * @apiDescription
 * Get an Edition By Plan Ext Key.
 *
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/product/edition/plan/MAYALT-M-BASIC
 *
 * @apiSuccessExample Success-Response
 {
     "edition": {
         "displayName": "Maya LT with Basic Support",
         "name": "Maya LT with Basic Support",
         "shortDesc": "Includes online community and forum support",
         "longDesc": "Need long description from Business",
         "smallImage": "http://static-dc.autodesk.net/content/dam/autodesk/www/products/autodesk-maya-lt/images/badges/maya-lt-2015-badge-75x75.png/_jcr_content/renditions/maya-lt-2015-badge-60x60.png",
         "usageType": "COM",
         "productLine": "Autodesk Maya LT",
         "isModule": false,
         "taxCode": "DC020500",
         "plans": [
             {
                 "name": "Monthly",
                 "externalKey": "MAYALT-M-BASIC",
                 "recurringPeriod": "MONTH",
                 "recurringFrequency": "1",
                 "prices": [
                     {
                         "currencyCode": "CAD",
                         "amount": "30.00"
                     },
                     {
                         "currencyCode": "USD",
                         "amount": "30.00"
                     }
                 ]
             }
         ]
     }
 }
 */
router.get('/edition/plan/:planExtKey', service.handleRequest.bind(product, product.getEditionByPlanExtKey));

/**
 * @api {get} /services/v1/product/card/plan/:planExtKey Get Product Information
 * @apiName getProductInformation
 * @apiGroup Product
 *
 * * @apiDescription
 * Get a Product Information By Plan Ext Key.
 *
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/product/cart/plan/MAYALT-M-BASIC
 *
 * @apiSuccessExample Success-Response
 {
    "edition": {
        "displayName": "Maya LT with Basic Support",
        "name": "Maya LT with Basic Support",
        "shortDesc": "Includes online community and forum support",
        "longDesc": "Need long description from Business",
        "smallImage": "http://static-dc.autodesk.net/content/dam/autodesk/www/products/autodesk-maya-lt/images/badges/maya-lt-2015-badge-75x75.png/_jcr_content/renditions/maya-lt-2015-badge-60x60.png",
        "usageType": "COM",
        "productLine": "Autodesk Maya LT",
        "isModule": false,
        "taxCode": "DC020500",
        "plans": [
            {
                "name": "Monthly",
                "externalKey": "MAYALT-M-BASIC",
                "recurringPeriod": "MONTH",
                "recurringFrequency": "1",
                "prices": [
                    {
                        "currencyCode": "CAD",
                        "amount": "30.00"
                    },
                    {
                        "currencyCode": "USD",
                        "amount": "30.00"
                    }
                ]
            }
        ]
    },
    "creditPackages": {
        "CAD": {
            "name": "Cloud Credits",
            "externalKey": "CREDITPACKAGE_CA",
            "units": "100",
            "description": "Autodesk CANADA",
            "taxCode": "SW052000",
            "price": {
                "currencyCode": "CAD",
                "amount": "105.00"
            }
        },
        "USD": {
            "name": "Cloud Credits",
            "externalKey": "CREDITPACKAGE",
            "units": "100",
            "description": "Autodesk has cloud services that can make your work even more awesome. Buy these credits so that you can use it against those services",
            "taxCode": "SW052000",
            "price": {
                "currencyCode": "USD",
                "amount": "100.00"
            }
        }
    }
}
 */
router.get('/cart/plan/:planExtKey', service.handleRequest.bind(product, product.getProductInformation));

module.exports = router;
