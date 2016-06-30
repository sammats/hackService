'use strict';
var express = require('express'),
    router = express.Router(),
    handler = require('../../../lib/utils/response.js').handleInsecureRequest,
    health = require('../../../lib/v1/health.js'),
    _ld = require('lodash-node'),
    corsConfig = require('config');

// TEMP added CORS headers for dev
router.all('*', function(req, res, next) {

    if (_ld.has(corsConfig, 'corsEnabled')) {
        res.header('Access-Control-Allow-Origin', '*');
    }

    res.header('Access-Control-Allow-Headers', 'Content-Type,Accept');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

/**
 * @api {get} /services/v1/health Amart Health Check
 * @apiName health
 * @apiGroup health
 *
 * @apiDescription
 Performs a health check on Amart, returning OK when the check is successful or returning fail:[error_message] when the check fails.
 Amart does self checks wherein Amart connect to AWS Redis Cache to check if it accepts new entries.
 In the Peers mode, the health Service checks all the peer systems which Amart is dependent upon.
 Peers are considered all immediate service connections and dependencies that are invoked in the course of a normal application run-time operation.

 Sample Request(s):
 http://ipp-dev.aws.autodesk.com/services/v1/health - This URL does the self check of Amart Service

 http://ipp-dev.aws.autodesk.com/services/v1/health?mode=peers - This URL does the peer (dependent systems) check of Amart Service.

 The dependent system for Amart are:

 1. Pelican
 2. Oxygen
 3. UCM and
 4. Payport


 * @apiSuccessExample Success - Response
 * When the call is successful: Response Status Code:200
 "OK"

 * @apiSuccessExample Self Check Failure - Response
 * When self check fails. Response Status Code: 504 (timeout) or 5XX
 "fail:Unable to insert data on A-mart cache."

 * @apiSuccessExample Peer Check Failure - Response
 * When peer check fails it provide the Error Message. Response Status Code: 504 (timeout) or 5XX
 "e.g: fail:Call to Pelican Service failed : <Error Message>"


 */
router.get('/', handler.bind(health, 'checkHealth'));

module.exports = router;
