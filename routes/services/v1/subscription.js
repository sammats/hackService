'use strict';
var express = require('express'),
    router = express.Router(),
    subscription = require('../../../lib/v1/subscription.js'),
    json = require('../../../lib/utils/response.js').setJson,
    outputJson = require('../../../lib/utils/output.js').json,
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
 * @api {post} /services/v1/subscription Creates a subscription on Pelican
 * @apiName createSubscription
 * @apiGroup Subscription
 *
 * @apiDescription
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/subscription
 *
 * @apiExample Request Body Example:
 * {
   "usageType":"FSN360-SUP",
   "userExtKey":"F8PKPV9NJBPT",
   "userId":"F8PKPV9NJBPT"
}
 *
 * @apiParam {usageType} The subscription type.
 *
 * @apiSuccessTitle (Success) - Status 200
 * @apiSuccess {Object} subscription The Subscription created.
 * @apiSuccess        {String} id The Subscription id.
 * @apiSuccess        {String} status The Subscription status.
 * @apiSuccess        {String} name The name of the subscription plan created.
 * @apiSuccess        {String} externalKey The external key of the subscription plan created.
 * @apiSuccess        {String} usageType The type of usage of the subscription plan created (COM, EDU, NCM, TRL, GOV).
 * @apiSuccessExample Success-Response:
 [
 {
     "subscription": {
         "id": "1052",
         "status": "ACTIVE",
         "name": "Fusion 360 Student",
         "externalKey": "FSN360-STD1",
         "usageType": "EDU"
     }
 }
 ]

 * @apiErrorTitle (Error) - Status 500
 * @apiError {Object} error The Error object.
 * @apiError    {String} code The Error code.
 * @apiError    {String} message The Error message.
 */
router.post('/', auth.validateSessionWithTimestamp, json.bind(subscription, 'createSubscription'));

/**
 * @api {get} / Get commercial plans by Plan Id.
 * @apiName getCommercialPlansByPlanId
 * @apiGroup Subscription
 *
 * @apiParam {productLine} The product line identifier.
 * @apiSuccessTitle (Success) - Status 200
 * @apiSuccess      {Object} Json array of subscription offers.
 * @apiSuccess        {String} id The Subscription id.
 * @apiSuccess        {String} externalKey The Subscription external key.
 * @apiSuccess        {Object} offers Subscription offers.
 * @apiSuccess        {String} externalKey The external key of the subscription offer.
 * @apiSuccess        {String} title Offer billing period.
 * @apiSuccess        {String} supportType Basic Support/Advanced Support
 * @apiSuccessExample Success-Response:
 [
 {
  "id": "1004",
  "externalKey": "MAYALT-BASIC",
  "offers": [
                 {
                     "externalKey": "MAYALT-M-BASIC",
                     "title": "MONTHLY",
                     "prices": {
                             "USD": "40.00"
                             }
                 },
                 {
                     "externalKey": "MAYALT-A-BASIC",
                     "title": "ANNUALLY",
                     "prices": {
                                 "USD": "300.00"
                                }
                 }
             ],
  "supportType": "Basic"
   }
 ]

 * @apiErrorTitle (Error) - Status 500
 * @apiError {Object} error The Error object.
 * @apiError    {String} code The Error code.
 * @apiError    {String} message The Error message.
 */
router.get('/commercialplans/:productLine', outputJson.bind(subscription, 'getActiveCommercialPlansByProductLine'));

module.exports = router;
