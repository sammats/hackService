'use strict';
var express = require('express');
var router = express.Router();
var auth = require('../lib/adsk-openid-client/auth');
var adskpassport = require('../lib/adsk-openid-client/AdskPassport');
var redirect = require('../lib/v1/estore-redirect.js');
var redirectfunc = require('../lib/utils/response.js').estoreRedirect;

/**
 * @api {get} /er Redirect for eStore
 * @apiName estoreRedirect
 * @apiGroup Redirect
 *
 * * @apiDescription
 * Makes the redirect for eStore.
 *
 *
 * Sample Request: cart-dev.aws.autodesk.com/er?offerExtKey=MAYALT-M-BASIC
 *
 * @apiParam {String} offerExtKey It is the Offering External Key.
 *
 * Successful calls will be redirected to eStore page.
 */
router.get('/',
    /* excluded the verify authentication step during redirect.
     This will enforce the user to signin before checking out.*/
    /*,adskpassport.verifyAuthentication*/
    redirectfunc.bind(redirect, 'processRedirect'));

/*This will be required if the authentication step above is uncommented.*/
/*
 router.post('/'
 ,redirectfunc.bind(redirect, "processRedirectAfterLogin"));
 */

module.exports = router;
