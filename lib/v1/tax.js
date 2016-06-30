'use strict';
var payportService = require('../client/payport/tax.js'),
    signature = require('../utils/signature.js'),
    utils = require('../utils/util.js'),
    store = require('../v1/store'),
    _ = require('lodash');

/**
 * Calls the getTaxes method on payportService and return the response, returning an error if the call fails.
 * To calculate the fees and taxes properly fetches the store data ether from Redis or Pelican
 * @param req request with tax parameters
 * @param callback returns calculated tax
 */
exports.getTaxes = function(req, callback) {

    var shippingFee = _.find(req.body.tax.fees, {'externalKey': 'SHIPPING_AND_HANDLING'});
    if (shippingFee && shippingFee.storeKey) {

        var options = {
            'params': {
                'extStoreKey': shippingFee.storeKey
            }
        };
        store.getStore(options, function(err, store) {

            if (err) {
                return callback(err);
            }

            var allShippingMethods = _.flatten(_.pluck(store.countries, 'shippingMethods')),
                currentShippingMethod = _.find(allShippingMethods, {'id': shippingFee.id});

            exports.getTaxesFromPayPort({req:req, shippingMethod:currentShippingMethod}, callback);
        });

    } else {
        exports.getTaxesFromPayPort(req, callback);
    }
};

/**
 * Calls the getTaxes method on payportService and return the response, returning an error if the call fails.
 * @param options Req or options {req,shippingMethod} request with tax parameters
 * @param callback returns calculated tax
 */
exports.getTaxesFromPayPort = function(options, callback) {

    var req = options.req ? options.req : options,
        shippingMethod = options.shippingMethod;

    payportService.getTaxes({
        body: createGetTaxesBody(req, shippingMethod),
        gtid: req.headers['X-Transaction-Ref']
    }, function(err, getTaxesResponse) {
        if (err) {
            return callback(err);
        } else {
            var taxes = JSON.parse(getTaxesResponse);
            if (!taxes.error) {
                signature.insertOfferSignaturesToTaxResponse(req, taxes);
            }
            return callback(null, taxes);
        }
    });

};

function createGetTaxesBody(req, currentShippingMethod) {

    var tax = req && req.body && req.body.tax ? req.body.tax : {},
        paymentProfile = tax.paymentProfile || {},
        taxBody = {
            'tax': {
                'currency': tax.currency,
                'offers': tax.offers,
                'billingInfo': paymentProfile.billingInfo,
                'shippingInfo': paymentProfile.shippingInfo
            }
        },
        shippingFee = _.find(req.body.tax.fees, {'externalKey': 'SHIPPING_AND_HANDLING'});

    if (shippingFee && currentShippingMethod) {
        shippingFee.amount = currentShippingMethod.price.amount;
        taxBody.tax.fees = [shippingFee];
    }

    return taxBody;
}
