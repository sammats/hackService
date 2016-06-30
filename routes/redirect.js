'use strict';
var express = require('express');
var router = express.Router();
var redirect = require('../lib/v1/redirect.js');
var redirectfunc = require('../lib/utils/response.js').redirect;
var _ld = require('lodash-node');
var corsConfig = require('config');

// TEMP added CORS headers for dev
router.all('*', function(req, res, next) {

    if (_ld.has(corsConfig, 'corsEnabled')) {
        res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

/**
 * @api {post} /r Redirect
 * @apiName redirect
 * @apiGroup Redirect

 * @apiDescription
 *  When the ipp redirect Url is received on the backend, before redirecting to Avangate, following process takes place:-
 *
 *  1. The IPP Url is generated with relevant parameters (such as signature, timestamp, userId and SubId or Offering Id or fx or partner)
 *
 *  2. New parameters like 'fx' and 'partner' are introduced. fx parameter is used to identify if cloud Credit page needs to be displayed instead of catalog page, whereas partner parameter is used to identify if redirect call is coming from Portal application (in this case partner =CEP)
 *
 *  3. The IPP Url signature for portal application will be different from CLIC application since the secret key for both of them are different
 *
 *  4. The User's profile is retrieved from Oxygen using the userId (OxygenId) from the query parameters. Oxygen's 'getUserProfile' API is used to retrieve the user's profile. Please refer to Oxygen's documentation here for details on the Oxygen API
 *
 *  5. The IPP Url is then embedded within the ippredirect Url and final Url is redirected to Avangate.
 *
 * Successful calls will be redirected to the IPP catalog page and the information within the parameters will be processed by the IPP service.
 *
 *
 * Sample Request:
 *  http://ipp-dev.aws.autodesk.com/r?signature=<signature>&timestamp=<timestamp>&userId=<userId>&country=<Country-Code>&subId=< Subscription ID>&offeringId=<Offer ID>&fx=CLDCR&partner=CEP
 *  Note: fx and partner parameters are not mandatory
 *  e.g. http://ipp-dev.aws.autodesk.com/r?signature=Y0nvGDpqsfZ1CzoeIpIVW2trDdK9tM5knoVNrtONBSE%3D&timestamp=2014-09-28T20:44:09Z&userId=RN2VMYHHFR85&country=US&subId=1011&offeringId=4567


 * @apiParam {String} signature    Required. It is a hascode generated with combination of userId and Timestamp along with the hash Secret Key
 * @apiParam {String} timestamp    Required. It is a time stamp in GMT format, e.g: 2014-09-28T20:44:09Z
 * @apiParam {String} userId    Required. This is an Oxygen ID
 * @apiParam {String} country    Required. Two-letter ISO code for the country of the user
 * @apiParam {String} subId    Optional. It is the Subscription ID. Either the Subscription ID or Offering ID is required, both could not be null
 * @apiParam {String} offeringID     Optional. It is the Offering ID. Either the Subscription ID or Offering ID is required, both could not be null
 */
router.get('/', redirectfunc.bind(redirect, 'processRedirect'));

module.exports = router;
