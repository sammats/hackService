'use strict';
var purchaseService = require('../client/payport/purchase.js'),
    utils = require('../utils/util.js'),
    signature = require('../utils/signature.js'),
    store = require('../v1/store'),
    _ = require('lodash');

/**
 * Performs an on site purchase through PayPort.
 * @param req
 * @param callback
 * @returns {*}
 */
exports.doOnsitePurchase = function(req, callback) {

    exports.getShippingBeforePurchase(req, false, callback);

};

/**
 * Generates a purchase and returns the PayPal URL to complete the purchase
 * @param req
 * @param callback
 * @returns {*}
 */
exports.getOffsitePurchaseUrl = function(req, callback) {

    exports.getShippingBeforePurchase(req, true, callback);

};

/**
 * If required, retrieves the store object from Redis or Pelican to validate shipping cost and completes the purchase
 * @param req
 * @param offsite
 * @param callback
 */
exports.getShippingBeforePurchase = function(req, offsite, callback) {
    var shippingFee = _.find(req.body.purchase.fees, {'externalKey': 'SHIPPING_AND_HANDLING'});
    if (shippingFee && shippingFee.storeKey) {

        var storeOptions = {
            'params': {
                'extStoreKey': shippingFee.storeKey
            }
        };
        store.getStore(storeOptions, function(err, store) {
            if (err) {
                return callback(err);
            }

            var allShippingMethods = _.flatten(_.pluck(store.countries, 'shippingMethods')),
                currentShippingMethod = _.find(allShippingMethods, {'id': shippingFee.id});

            exports.completePurchase({req:req, offsite:offsite, shippingMethod:currentShippingMethod}, callback);

        });

    } else {
        exports.completePurchase({req:req, offsite:offsite}, callback);
    }
};

/**
 * Completes the purchase once the shipping method has been validated (if required)
 * @param options
 * @param options.req original request
 * @param options.shippingMethod validated shipping method for purchases with shippable products
 * @param options.offsite When true indicates an offsite purchase e.g. PayPal
 * @param callback
 * @returns {*}
 */
exports.completePurchase = function(options, callback) {
    if (!signature.containsValidSignatures(options.req)) {
        return callback(new Error('Invalid signature.'));
    }

    try {
        addWebInfo(options.req);
        addIpAddress(options.req);
        addShippingInfo(options.req, options.shippingMethod);
        if (!options.offsite) {
            validateOrRemovePurchaseOrigin(options.req);
        }
    } catch (err) {
        return callback(err);
    }

    var params = {
        body : options.req.body,
        gtid: options.req.headers['X-Transaction-Ref'],
        userExtKey: options.req.param('userExtKey'),
        offsite: options.offsite,
        syncUCM: !options.offsite && isPaylPal(options.req)
    };

    purchaseService.doPurchase(params, function(err, response) {
        if (options.offsite) {
            return offSitePurchaseHandler(err, response, callback);
        } else {
            return onSitePurchaseHandler(err, response, callback);
        }
    });
};

/**
 * Handles the callback for onsite purchases
 */
function onSitePurchaseHandler (err, response, callback) {
    if (err) {
        return callback(err);
    } else {
        var filteredResponse = filterResponse(JSON.parse(response));
        callback(null, filteredResponse);
    }
}

/**
 * Handles the callback for PayPal purchases
 */
function offSitePurchaseHandler(err, response, callback) {
    return err ? callback(err) : callback(null, JSON.parse(response));
}

/**
 * filter response for certain properties we don't want to expose
 */
function filterResponse(purchaseResponse) {
    if (!purchaseResponse.error) {
        delete purchaseResponse.purchaseOrder.userId;
        delete purchaseResponse.purchaseOrder.userExtKey;
        delete purchaseResponse.purchaseOrder.state;
        delete purchaseResponse.purchaseOrder.properties;
        if (purchaseResponse.purchaseOrder.cart) {
            delete purchaseResponse.purchaseOrder.cart.needsTaxAmounts;
            if (purchaseResponse.purchaseOrder.cart.offers) {
                purchaseResponse.purchaseOrder.cart.offers.filter(function(offer) {
                    delete offer.skuId;
                    delete offer.taxCode;
                    return offer;
                });
            }
        }
    }

    return purchaseResponse;
}

function validateOrRemovePurchaseOrigin(req) {
    var origin = req.body.purchase.origin,
        mappedOrigin = utils.getPartnerConfig(origin);

    if (mappedOrigin === null) {
        delete req.body.purchase.origin;
        return true;
    }
    req.body.purchase.origin = mappedOrigin.origin;
}

function addWebInfo(req) {
    if (!utils.isValid(req) || !utils.isValid(req.body) || !utils.isValid(req.headers)) {
        throw new Error('Invalid request. The request must be valid, have a body and its body must have a user. ' +
        'It also must be an http request and contain a \'connection\'');
    }

    req.body.purchase.webInfo = {
        userAgent: req.headers['user-agent'],
        remoteHost: req.headers['host']
    };
}

function addIpAddress(req) {
    if (!utils.isValid(req) ||
        !utils.isValid(req.body) ||
        !utils.isValid(req.body.purchase) ||
        !utils.isValid(req.body.purchase.user) ||
        !utils.isValid(req.connection)) {
        throw new Error('Invalid request. The request must be valid, have a body and its body must have a ' +
        'purchase.user. It also must be an http request and contain a \'connection\'');
    }
    var user = req.body.purchase.user;
    user.ip = utils.getIpAddress(req);
}

function addShippingInfo(req, shippingMethod) {
    if (utils.isValid(req) &&
        utils.isValid(req.body) &&
        utils.isValid(req.body.purchase) &&
        utils.isValid(req.body.purchase.fees)) {

        var shippingFee = _.find(req.body.purchase.fees, {'externalKey': 'SHIPPING_AND_HANDLING'});

        if (shippingFee && shippingMethod) {
            shippingFee.amount = shippingMethod.price.amount;
            req.body.purchase.fees = [shippingFee];
        }
    }
}

function isPaylPal(req) {
    return req.body &&
        req.body.purchase &&
        req.body.purchase.origin &&
        req.body.purchase.origin.toUpperCase() === 'ESTORE' &&
        req.body.purchase.user &&
        req.body.purchase.user.paymentProfile &&
        req.body.purchase.user.paymentProfile.type &&
        req.body.purchase.user.paymentProfile.type.toLowerCase() === 'paypal';
}

