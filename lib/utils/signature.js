'use strict';
var crypto = require('crypto');
var amartSignature = require('config').amartSignature;
var logger = require('./logger.js');
var _ = require('lodash');

/*
 Insert a signature on get taxes based on its data.
 */
exports.insertOfferSignaturesToTaxResponse = function(req, taxResponse) {
    taxResponse.cart.offers.forEach(function(offer) {
        offer.signature = generateOfferSignature(req, offer, getBillingInfoFromRequest(req));
    });
};

/*
 Checks if the getTaxes signature is valid or not for the purchase request
 */
exports.containsValidSignatures = function(req) {
    if (req &&
        req.body &&
        req.body.purchase) {
        return _.every(req.body.purchase.offers, function(offer) {
            var expectedSig = generateOfferSignature(req, offer, getBillingInfoFromRequest(req));

            logger.debug('isValidTaxSignatureForPurchase - thisSignature: ' + expectedSig,
                {gtid: req.headers['X-Transaction-Ref']});
            logger.debug('isValidTaxSignatureForPurchase - offer.signature: ' + offer.signature,
                {gtid: req.headers['X-Transaction-Ref']});

            return expectedSig === offer.signature;
        });
    } else {
        logger.debug('isValidTaxSignatureForPurchase - Impossible to validate the signature because one of the input ' +
        'parameters is invalid.', {gtid: req.headers['X-Transaction-Ref']});
        return false;
    }
};

/*
 * Returns billing info needed for signature generation from the request
 */
function getBillingInfoFromRequest(req) {
    var billingInfo = req.body.tax ?
        req.body.tax.paymentProfile.billingInfo :
        req.body.purchase.user.paymentProfile.billingInfo;

    return {
        stateProvince: billingInfo.stateProvince,
        postalCode: billingInfo.postalCode,
        country: billingInfo.country
    };
}

/*
 * Composes json for signature and generates signature from the stringified version
 */
function generateOfferSignature(req, offer, address) {
    var json = {
        'userExtKey' : req.param('userExtKey'),
        'amount': offer.amount,
        'taxCode': offer.taxCode,
        'taxAmount': offer.taxAmount,
        'sessionId' : req.headers.sessionid,
        'address': address
    };
    var jsonAsString = JSON.stringify(json);

    logger.debug('OfferSignature (JSON): ' + jsonAsString, {gtid: req.headers['X-Transaction-Ref']});

    return generateSignature(jsonAsString);
}

/*
 * Generates a signatures from data
 */
function generateSignature(data) {
    return crypto.createHash('sha256').update(data + amartSignature).digest('base64');
}
