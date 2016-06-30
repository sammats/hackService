'use strict';
var express = require('express'),
    router = express.Router(),
    _ld = require('lodash-node'),
    cleanser = require('../../../lib/v1/cleanser.js'),
    setJson = require('../../../lib/utils/response.js').setJson,
    auth = require('../../../lib/auth/auth.js'),
    corsConfig = require('config');

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
 * @api {post} /services/v1/cleanser/address Cleanse Address
 * @apiName cleanseAddress
 * @apiGroup cleanse

 * @apiDescription
 * Cleanse a received address and returns the address cleansed or an error if the address could not be found.
 * A-Mart uses Trillium to cleanse the address.
 *
 * The response will contain an address (if the address was a match or could be cleansed), a type (SUCCESS/ERROR), a matchLevel and a matchLevelDesc.
 *
 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/cleanser/address
 *
 *
 * @apiExample Match Level Description
 *
 * The possible matchLevel/matchLevelDesc are:
 *
 * "code"                   | "message"                     | "Description"
 *  "ADRVR-000"             | "EXACT_MATCH"                 | "The address informed is EXACTLY the same as the one found in Trillium"
 *  "ADRVR-001"             | "SUGGESTED_ADDRESS"           | "Trillium found a suggested address for the address informed"
 *  "ADRVR-002"             | "CITY_OR_ZIP_CODE_FAILURE"    | "The city or zip code informed could not be found"
 *  "ADRVR-003"             | "STREET_NAME_FAILURE"         | "The street informed could not be found"
 *  "ADRVR-004"             | "HOUSE_NUMBER_RANGE_FAILURE"  | "The house number is out of range on the street informed"
 *  "ADRVR-005"             | "GENERAL_ERROR"               | "Trillium returned a generic error, like: Multiple possible matches to Directory, Match exists, but too many corrections were required to make the match, etc"
 *  "ADRVR-006"             | "INTERNAL_ERROR"              | "Internal error on A-Mart or Trillium or timeout to call Trillium"
 *  "ADRVR-007"             | "INVALID_REQUEST"             | "The request does not contain the necessary parameters."
 *
 * @apiExample Request Body Example:
 {
    "address": {
        "city": "San Francisco",
        "country": "US",
        "postalCode": "94108",
        "stateProvince": "CA",
        "streetAddress": "1 Market"
    }
}

 * @apiParam {JSON} address The Address containing the following items.
 * @apiParam {String} city The city
 * @apiParam {String} country The country code (US, CA, etc)
 * @apiParam {String} postalCode The postal code
 * @apiParam {String} stateProvince The state
 * @apiParam {String} streetAddress The street address
 *
 * @apiSuccessExample Possibilities
 *
 * {
	"validationStatus": {
	   "type":"SUCCESS | ERROR",
	   "status" : EXACT_MATCH | SUGGESTION_FOUND | ERROR
	   "code": code,
	   "message": message,
	   "address": null if error and the address otherwise
	}
}
 *
 * @apiSuccessExample Exact Match
 *
 {
   "validationStatus":{
      "type":"SUCCESS",
      "status":"EXACT_MATCH",
      "code":"ADRVR-000",
      "message":"EXACT_MATCH",
      "address":{
         "city":"Calgary",
         "country":"CA",
         "postalCode":"T2P 5J4",
         "stateProvince":"AB",
         "streetAddress":"1121 6 Ave SW"
      }
   }
}

 * @apiSuccessExample Suggestion Found
 {
    "validationStatus":{
       "type":"SUCCESS",
       "status":"SUGGESTION_FOUND",
       "code":"ADRVR-001",
       "message":"SUGGESTED_ADDRESS",
       "address":{
          "city":"San Francisco",
          "country":"US",
          "postalCode":"94105-1420",
          "stateProvince":"CA",
          "streetAddress":"1 Market St"
       }
    }
 }

 * @apiSuccessExample Error
 {
   "validationStatus":{
      "type":"ERROR",
      "status":"ERROR",
      "code":"ADRVR-003",
      "message":"STREET_NAME_FAILURE",
      "address":null
   }
}

 */
router.post('/address', auth.validateSessionWithTimestamp, setJson.bind(cleanser, 'cleanseAddress'));

module.exports = router;
