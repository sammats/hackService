'use strict';
var express = require('express'),
    router = express.Router(),
    paymentProfiles = require('../../../lib/v1/paymentprofiles.js'),
    setJson = require('../../../lib/utils/response.js').setJson,
    handleRequest = require('../../../lib/utils/response.js').handleRequest,
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
 * @api {get} /services/v1/paymentprofiles Get Payment Profiles from PayPort and UCM
 * @apiName getPaymentProfiles
 * @apiGroup Payment Profiles
 *
 * @apiDescription
 * Get the Payment Profiles from Payport and merge with billing info from UCM
 * This function will return a list of payment profiles for a specific user and for a specific country.
 * The payment profiles will contain data from Payport and UCM.
 * The data from Payport will be related to credit card info while the data from UCM will be related to the billing info.
 *
 * When there is a payment profile on Payport with a match on UCM (the match is made by the card's last 4 digits and its type), the credit card info will contain data from Payport and the billing info will contain data from UCM.
 * When there is a payment profile on Payport without a match on UCM, both credit card info and billing info will contain data from Payport.
 * When there is no payment profile on Payport but there are payment profiles on UCM, this method will return the payment profile from UCM within the last used card number (i.e. most recent lastUsedDate). However, it will only return billing info, but not credit card info.
 * When there is no payment profile on Payport and UCM, this method will return an empty list.
 *
 * When there are payment profiles on Payport, this method does not return profiles from UCM that don't match profiles on Payport.
 *
 * When there is an error on UCM call, the method works as the UCM payment profiles were empty, but doesn't throw an Error.
 * WHen there is an error on Payport call, the methdo throws an Error.
 *
 * Sample Requests:
 http://ipp-dev.aws.autodesk.com/services/v1/paymentProfiles?userExtKey=paola-003&country=US&ucmpaymentprofiles=%5B%5D
 http://ipp-dev.aws.autodesk.com/services/v1/paymentProfiles?syncUCM=1&userExtKey=paola-003
 *
 * @apiParam {String} syncUCM If true (==1), amart will call PayPort sending the O2ID and syncUCM = 1 and don’t merge.  If false (!=1) or null, amart will call Payport without sending the syncUCM.
 * @apiParam {String} userExtKey The user id from PayPort. Mandatory.
 * @apiParam {String} country (optional) The country of the payment profiles to be returned. Only payment profiles from this country will be returned. When country is passed, ucmpaymentprofiles must be passed also.
 * @apiParam {JSON} ucmpaymentprofiles (optional) When passed, a-mart will use this list as the payment profiles from UCM. When not passed, a-mart will call the payment profiles from UCM. When ucmpaymentprofiles is passed, country must be passed also. If syncUCM is true, don’t care about the list and don’t merge.
 *
 * @apiSuccessTitle (Success) - Status 200
 * @apiSuccess {array} paymentProfiles The list of payment profiles.
 * @apiSuccess {Object} paymentProfiles.paymentProfile One of the payment profiles returned.
 * @apiSuccess {Object} paymentProfiles.paymentProfile.creditCardInfo The credit card information
 * @apiSuccess {String} paymentProfiles.paymentProfile.creditCardInfo.last4Digits The last 4 digits of the credit card
 * @apiSuccess {String} paymentProfiles.paymentProfile.creditCardInfo.cardType The credit card type
 * @apiSuccess {String} paymentProfiles.paymentProfile.creditCardInfo.expMonth The credit card expiration month
 * @apiSuccess {String} paymentProfiles.paymentProfile.creditCardInfo.expYear The credit card expiration year
 * @apiSuccess {Object} paymentProfiles.paymentProfile.billingInfo The billing information
 * @apiSuccess {String} paymentProfiles.paymentProfile.billingInfo.firstName The first name
 * @apiSuccess {String} paymentProfiles.paymentProfile.billingInfo.lastName The last name
 * @apiSuccess {String} paymentProfiles.paymentProfile.billingInfo.streetAddress The billing info address containing all 3 addresses from UCM
 * @apiSuccess {String} paymentProfiles.paymentProfile.billingInfo.city The city
 * @apiSuccess {String} paymentProfiles.paymentProfile.billingInfo.country The country code
 * @apiSuccess {String} paymentProfiles.paymentProfile.billingInfo.stateProvince The state
 * @apiSuccess {String} paymentProfiles.paymentProfile.billingInfo.postalCode The postal code
 * @apiSuccess {String} paymentProfiles.paymentProfile.billingInfo.lastUsedDate The last used date of the payment profile
 *
 * @apiSuccessExample Success-Response: (First one with address from UCM, second one with address from Payport)
 *     [
 *        {
 *	        "paymentProfile": {
 *	            "creditCardInfo": {
 *	                "last4Digits": "4444",
 *	                "cardType": "VISA",
 *	                "expMonth": "05",
 *	                "expYear": "22"
 *	            },
 *	            "billingInfo": {
 *	                "firstName": "Bob",
 *	                "lastName": "Lee",
 *	                "streetAddress": "6 Merrydale Avenue Suite 22",
 *	                "city": "San Rafael",
 *	                "country": "US",
 *	                "stateProvince": "CA",
 *	                "postalCode": "94903",
 *	                "lastUsedDate": "07/05/2014 00:00:00"
 *	            }
 *	        }
 *	    },
 *        {
 *	        "paymentProfile": {
 *	            "creditCardInfo": {
 *	                "last4Digits": "1111",
 *	                "cardType": "VISA",
 *	                "expMonth": "11",
 *	                "expYear": "2018"
 *	            },
 *	            "billingInfo": {
 *	                "firstName": "TestUser",
 *	                "lastName": "TestName",
 *	                "streetAddress": "1 Main St",
 *	                "city": "San Francisco",
 *	                "country": "US",
 *	                "stateProvince": "CA",
 *	                "postalCode": "94501",
 *	                "lastUsedDate": null
 *	            }
 *	        }
 *	    }
 *    ]
 *
 * @apiErrorTitle (Error) - Status 500
 * @apiError {Object} error The Error object.
 * @apiError {String} error.code The Error code.
 * @apiError {String} error.message The Error message.
 */
router.get('/', auth.validateSessionWithTimestamp, setJson.bind(paymentProfiles, 'getPaymentProfiles'));

/**
 * @api {post} /services/v1/paymentprofiles Add Payment Profile on PayPort
 * @apiName addPaymentProfile
 * @apiGroup Payment Profiles

 * @apiDescription
 * This function adds a Payment Profile on BlueSnap through PayPort.
 * It receives a body with the parameters that PayPort.addPaymentProfile receives but not receiving the following parameters: user.ip.
 * The user.ip will be generated based on request information.
 * It also receives the userExternalKey as query string parameters. Both are mandatory.

 * Sample Request:  http://ipp-dev.aws.autodesk.com/services/v1/paymentProfiles?grantToken=abcd&userExtKey=F8PKPV9NJBPT

 * @apiExample Request Body Example:
 {
 "user": {
   "paymentProfile": {
     "creditCardInfo": {
       "encryptedCardNumber": "$bsjs_0_0_1$pvHZmBkcn+u9GZxGvts6XlVh6TUWWQQx/l9nCajgaWuHCGDk7ncpM5PiyXb/oOzJz7UgrSYuU/5QJjDACC0ig7HMi/s9yvhe8mJxntGhYA6PvssApPD+cKtNpuTZhDRQmF4gsphrKdIrwR3B0670MQYr7V0g2SvkA+6bgmulMkS6xj+X9B5K6glUOHq/FxcOHXlBr2uZDk0okUOpXehjtj+ijus4SWvq+lnXm0p3/M8oolVhUiQMkc+51YY5OkWb+7A2FHC+QA0K5VOSVX5AHHUWNgR0WyQZDcXCLgfOxb9ewbGZmHuecU/o2vgSyp/Td/dIuYLysiHgIoGj2SlmzQ==$KQyuNuawmgZZBlKcyOvz/6oyY2CjrTg/yDmVGC8q8VlRk6ZKqeFDz1ufdpAPclCJ$BHyMZ2Y9antj+vcq1xviMrsSNGoR8h5/ZhG8+hSCfIQ=",
       "encryptedCVV": "$bsjs_0_0_1$DYgUdmIObUGlf4ZUbaKBtuAFTalIu0nq3wtkAhTC3Id/0oRyVJ1GDmzBhW1TRBdONfDCaBEx1ATvn/BpDbtsL80Uu8XWQaZwVTEeQSJ4GcoSDosXSTnkCRPEWxAF5VcAsviYmZ8JajS9aoEsgEEkH/klW/pYcAj0gBnJM9haz8rC94iW8sarwW34z6rDcbkfq3fSx1I9/2YGim4B/bUhibGekGF8xYL1nqu2l0VjF/PHduhr+xqgJB9SMRs7C8jzIEUaN/Vm5GutNXsUmCgwG/si2UcjCPaEoKGMONKbS1pMRQsz1z4xia5wqHEQYBpzaGGdVFTQHxN4cyPCp1uWmA==$Fz3oTXTQl3Ekdf1S5BO6n3yAal0FEnWoE3zmX3H+LfQ=$FVblfVSczbNDI7ymXswMnk+aNxAld8MkV3pHtis15j0=",
       "expMonth": "11",
       "expYear": "2018",
       "cardType": "VISA"
     },
     "billingInfo": {
       "firstName": "TestUser",
       "lastName": "TestName",
       "streetAddress": "1 Main St",
       "city": "San Francisco",
       "stateProvince": "CA",
       "country": "US",
       "postalCode": "94501"
     }
   },
   "email": "shopper@BlueSnap.com"
 }
 }

 * @apiParam {String} grantToken The authentication token.
 * @apiParam {String} userExtKey The user id from PayPort.
 * @apiParam {JSON} body The purchase body on a JSON format.

 * @apiSuccessExample Success-Response
 {
  "paymentProfile":{
     "creditCardInfo":{
        "last4Digits":"5100",
        "cardType":"MASTERCARD",
        "expMonth":"11",
        "expYear":"2018"
     },
     "billingInfo":{
        "firstName":"TestUser",
        "lastName":"TestName",
        "streetAddress":"1 Main St",
        "city":"San Francisco",
        "stateProvince":"CA",
        "country":"US",
        "postalCode":"94501"
     },
     "id":"1407",
     "userId":"1011"
  }
}
 */
router.post('/', auth.validateSessionWithTimestamp, handleRequest.bind(paymentProfiles, 'addPaymentProfile'));

/**
 * @api {put} /services/v1/paymentprofiles Update Payment Profile on PayPort
 * @apiName updatePaymentProfile
 * @apiGroup Payment Profiles
 *
 * @apiDescription
 * This function updates a Payment Profile on BlueSnap through PayPort.
 * It receives a body with the parameters that PayPort.updatePaymentProfile receives but not receiving the following parameters: user.ip.
 * The user.ip will be generated based on request information.
 * It also receives the userExternalKey as query string parameters. Both are mandatory.

 * Sample Request: http://ipp-dev.aws.autodesk.com/services/v1/paymentProfiles?grantToken=abcd&userExtKey=F8PKPV9NJBPT

 * @apiExample Request Body Example:
 {
"user": {
  "paymentProfile": {
    "creditCardInfo": {
      "last4Digits": "1111",
      "cardType": "VISA"
    }
  }
}
}

 * @apiParam {String} grantToken The authentication token.
 * @apiParam {String} userExtKey The user id from PayPort.
 * @apiParam {JSON} body The purchase body on a JSON format.



 * @apiSuccessExample Success-Response
 {
  "paymentProfile":{
     "creditCardInfo":{
        "last4Digits":"1111",
        "cardType":"VISA",
        "expMonth":"11",
        "expYear":"2018"
     },
     "billingInfo":{
        "firstName":"Original",
        "lastName":"Gangster",
        "streetAddress":"2100 Playa Drive",
        "city":"San Fran",
        "stateProvince":"CA",
        "country":"US",
        "postalCode":"95411-1234"
     },
     "id":"1273",
     "userId":"1189"
  }
}
 */
router.put('/', auth.validateSessionWithTimestamp, handleRequest.bind(paymentProfiles, 'updatePaymentProfile'));

module.exports = router;
