'use strict';
var querystring = require('querystring'),
    Cookies = require('cookies'),
    utils = require('./util.js'),
    logger = require('./logger.js'),
    cartFrontEndUrl = require('config').siteFrontEndUrl;

exports.json = function(request, req, res) {

    if (!isValidInitializerRequest(req)) {
        logger.debug('Invalid request parameters.');
        return sendResponse(res, 400, {});
    }

    req.query.userExtKey = req.query.userId;

    var initializer = this[request];

    initializer(req, function(err, response) {
        logger.incomingPayload(req, res, response);

        if (err) {
            res.status(200);
            logger.error(req, res, err.code, err.message);
            return sendResponse(res, 200, getErrorMessage('500', err.message));
        }
        res.contentType('application/json');
        res.responseSent = true;
        logger.info(req, res);
        return res.send(JSON.stringify([response]));
    });
};

exports.setJson = function(request, req, res) {
    var thisReq = this[request];

    thisReq(req, function(err, response) {
        responseHandler(req, err, res, response);
    });
};

/*
 * Creates the subscription response containing subscription data from Pelican.
 * Throws an Error when parameter (res) is invalid or if its attributes (subscription and subscription.subscriptionPlan) are invalid.
 *
 *  @return {JSON Object} the subscription response.
 */
exports.setSubscriptionResponse = function(res) {
    if (!utils.isValid(res) ||
        !utils.isValid(res.subscription) ||
        !utils.isValid(res.subscription.subscriptionPlan)) {
        throw new Error('Invalid response from Pelican when creating a subscription');
    }

    var subscriptionResponse = {
        subscription: {
            id: res.subscription.id,
            status: res.subscription.status,
            name: res.subscription.subscriptionPlan.name,
            externalKey: res.subscription.subscriptionPlan.externalKey,
            usageType: res.subscription.subscriptionPlan.usageType
        }
    };

    return subscriptionResponse;
};
/*
 *  Build a redirect url based on the request parameters passed on query string.
 *	The function Ist check for the null or  '' values, if found throws the status 400 - Bad request
 *  If all the request has a value then, the function calls the /lib/vi/redirect.js. Once requests are
 *  processed and successfully validated, the function constructs the response parameters and uses 302 temporary
 *	redirect URL to IPP UI
 *  @param {Object} request - request Object
 *	@param {Object} req
 *	@param {Object} res
 *  @return {Object} response redirect url
 */
exports.redirect = function(request, req, res) {
    var cookies, params, completeURL;
    if (!req.query.signature || !req.query.timestamp || !req.query.userId ||
        !req.query.country || !req.query.partner ||
        ((!req.query.subId && !req.query.offeringId) && !req.query.fx)) {
        res.status(400);
        logger.error(req, res, undefined, 'Unauthorized Request - Parameter not found.');
        return sendResponse(res, 400, {});
    }

    this[request](req, function(err, response) {
        logger.incomingPayload(req, res, response);

        if (err) {
            res.status(401);
            logger.error(req, res, err.code, err.message);
            return sendResponse(res, 401, 'Unauthorized Request - ' + err);
        }
        res.contentType('application/json');
        cookies = new Cookies(req, res);
        cookies.set('ipp_sessionId', response.user.sessionId, {maxAge: null, httpOnly: false});
        cookies.set('ipp_grantToken', response.user.grantToken, {maxAge: null, httpOnly: false});
        cookies.set('ippSig', response.user.signature, {maxAge: null, httpOnly: false});
        cookies.set('ippTS', response.user.timestamp, {maxAge: null, httpOnly: false});
        cookies.set('ippUid', response.user.userId, {maxAge: null, httpOnly: false});
        cookies.set('partner', response.user.partner, {maxAge: null, httpOnly: false});

        if (utils.isValid(req.query.subId)) {//pass subID if exist
            params = {country: response.user.country, subId: response.user.subId};
        } else if (utils.isValid(req.query.offeringId)) { //Only pass offeringId if subId doesn't exists.
            params = {country: response.user.country, offeringId: response.user.offeringId};
        } else { // Only pass fx if both SubID and OfferingId does not exists.
            params = {country: response.user.country, fx: response.user.fx};
        }

        completeURL = '/?' + querystring.stringify(params);

        res.writeHead(302, {
            'Location': completeURL
        });
        logger.info(req, res);
        res.end();

    });
};

exports.estoreRedirect = function(request, req, res) {
    var cookies, params, completeURL;

    this[request](req, function(err, response) {

        res.contentType('application/json');
        cookies = new Cookies(req, res);
        cookies.set('uid', response.user.userId, {maxAge: 9000, httpOnly: false});

        completeURL = '/?offerExtKey=' + response.user.offerExtKey;

        res.writeHead(302, {
            'Location': completeURL
        });
        res.end();

    });
};

/**
 * Handler function for the cartRedirect method.
 *
 * @param request - name of the function to be called.
 * @param req - The contents of the request.
 * @param res - {Required} - Response object to be returned upon the completion of the function
 *
 * @returns 302/500 status codes with respect to the outcome.
 */

exports.cartRedirectHandler = function(request, req, res) {

    var cartRequest = this[request];

    cartRequest(req, res, function(err, response) {
        var cartUrl = (req.get('host').match(/localhost/)) ? cartFrontEndUrl : 'https://' + req.get('host');

        if (err) {
            return res.redirect(302, cartUrl + '/cart/error');
        }

        return res.redirect(302, cartUrl + '/cart');
    });
};

/**
 * Handler function for methods that need to retrieve and update a cart.
 *
 * @param request - name of the function to be called.
 * @param req - The contents of the request.
 * @param res - {Required} - Response object to be returned upon the completion of the function
 *
 * @returns 200/500 status codes with respect to the outcome.
 */
exports.cartUpdateHandler = function(request, req, res) {

    if (!req.get('content-type').match(/application\/json/)) {

        logger.error(req, res, 500, 'Error, expected content type application/json, received: ',
            req.get('content-type'));
        return res.sendStatus(500);
    }

    this.updateCart(request, req, function(err, cart) {
        responseHandler(req, err, res, cart);
    });

};

/**
 * Special handler function for the updateKey function. The reason for this function
 * is because it returns a res object rather than a cart object. Until the current
 * handler function gets abstracted, this should suffice.
 *
 * Res must be a part of the call back even when there is an error.
 *
 * @param request - name of the function to be called.
 * @param req - The contents of the request.
 * @param res - {Required} - Response object to be returned upon the completion of the function
 *
 * @returns 204/500 status codes with respect to the outcome.
 */

exports.cartKeyHandler = function(request, req, res) {

    var cartRequest = this[request];

    cartRequest(req, res, function(err, res) {

        if (err) {
            return res.status(500).end();
        }
        return res.status(204).end();
    });
};

function isValidInitializerRequest(req) {
    return (utils.isValid(req.query.userId) &&
    utils.isValid(req.query.country) &&
    (utils.isValid(req.query.subId) || utils.isValid(req.query.offeringId) || utils.isValid(req.query.fx)));
    //&& utils.isValid(req.headers.granttoken) && utils.isValid(req.headers.sessionid))
}

/*  Creates the POST / PUT response containing payment profile data from PSP Handler.
 *  @param {Object} request - request Object
 *	@param {Object} req
 *	@param {Object} res
 *  @return {Object} response - String
 */

exports.handleRequest = function(request, req, res) {
    var thisReq = this[request];

    thisReq(req, function(err, response) {
        responseHandler(req, err, res, response);
    });
};

/*
 Response handler for insecure requests, like the health check for example.
 */
exports.handleInsecureRequest = function(request, req, res) {
    this[request](req, function(err, response) {
        logger.incomingPayload(req, res, response);
        if (err) {
            res.status(500);
            logger.error(req, res, err.code, err.message);
            sendResponse(res, 500, getGenericErrorMessage(err.message));
            return;
        }
        logger.info(req, res);
        res.send(response);
    });
};

function responseHandler(req, err, res, response) {
    logger.incomingPayload(req, res, response);

    if (err) {
        res.status(500);
        logger.error(req, res, err.code, err.message);
        sendResponse(res, 500, getGenericErrorMessage(err.message));
        return;
    }

    logger.info(req, res);
    res.json(response);
}

function sendResponse(res, status, json) {
    res.responseSent = true;
    return res.status(status).send(json);
}

/*
 Generates a generic error message containing the code 100 and the 'errorMessage' received as parameter as the message.
 */
function getGenericErrorMessage(errorMessage) {
    return getErrorMessage('100', 'Generic Error: ' + errorMessage);
}

function getErrorMessage(code, errorMessage) {
    return {
        'error': {
            'code': code,
            'message': errorMessage
        }
    };
}

exports.sendResponse = sendResponse;
exports.getGenericErrorMessage = getGenericErrorMessage;

exports.setPayportPaymentProfilesResponse = function(payportPaymentProfile) {

    if (!utils.isValid(payportPaymentProfile) ||
        (!utils.isValid(payportPaymentProfile.creditCardInfo) && !utils.isValid(payportPaymentProfile.paymentInfo)) ||
        !utils.isValid(payportPaymentProfile.billingInfo)) {
        throw new Error('Invalid response from PayPort when getting a Payment Profile.');
    }

    var options = (arguments.length > 1) ? arguments[1] : {};
    var paymentProfileResponse = {
            paymentProfile: {
                type: payportPaymentProfile.type || 'CREDIT_CARD',
                paymentInfo: payportPaymentProfile.paymentInfo,
                creditCardInfo: payportPaymentProfile.creditCardInfo,
                billingInfo: {
                    firstName: payportPaymentProfile.billingInfo.firstName,
                    lastName: payportPaymentProfile.billingInfo.lastName,
                    companyName: payportPaymentProfile.billingInfo.companyName,
                    streetAddress: payportPaymentProfile.billingInfo.streetAddress,
                    city: payportPaymentProfile.billingInfo.city,
                    country: payportPaymentProfile.billingInfo.country,
                    stateProvince: payportPaymentProfile.billingInfo.stateProvince,
                    postalCode: payportPaymentProfile.billingInfo.postalCode,
                    phoneNumber: payportPaymentProfile.billingInfo.phoneNumber,
                    lastUsed: payportPaymentProfile.billingInfo.lastUsed
                }
            }
        };

    if ((!options.storeType || options.storeType !== 'IPP') && payportPaymentProfile.shippingInfo) {
        paymentProfileResponse.paymentProfile.shippingInfo = {
            firstName: payportPaymentProfile.shippingInfo.firstName,
            lastName: payportPaymentProfile.shippingInfo.lastName,
            companyName: payportPaymentProfile.shippingInfo.companyName,
            streetAddress: payportPaymentProfile.shippingInfo.streetAddress,
            city: payportPaymentProfile.shippingInfo.city,
            country: payportPaymentProfile.shippingInfo.country,
            stateProvince: payportPaymentProfile.shippingInfo.stateProvince,
            postalCode: payportPaymentProfile.shippingInfo.postalCode,
            phoneNumber: payportPaymentProfile.shippingInfo.phoneNumber,
            lastUsed: payportPaymentProfile.shippingInfo.lastUsed
        };
    }

    return paymentProfileResponse;
};
