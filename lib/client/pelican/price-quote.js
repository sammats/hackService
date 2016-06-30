'use strict';
var client = require('./pelican_client.js');
var _ = require('lodash');

/**********************************************************************************************************
 Function    : getPriceQuote

 @param {String} userId - the external user identifier
 @param {String} lineItems - products line items
 @param {String} shipping - shipping information
 @param {Object} callback - callback object
 @return {Object} callback

 Description : This will make a call to the pelican restful API "PriceQuote" service end-point.
 This do the calculations for the cart totals, return an object containing this information.

 ***********************************************************************************************************/

exports.getPriceQuote = function(userId, lineItems, shipping, callback) {

    var lineItemBody,
        requestBody = {
            'data': {
                'type': 'cart',
                'buyerId': userId || '',
                'lineItems': [],
                'shipping': {}
            }
        };

    if (shipping) {
        requestBody.data.shipping = {
            'shippingMethod': shipping.shippingMethodExternalKey,
            'additionalFees': [],
            'shipTo': {
                'streetAddressLine1': shipping.streetAddressLine1,
                'city': shipping.city,
                'state': shipping.state,
                'country': shipping.country
            }
        };
        requestBody.data.shipping.additionalFees.push({
            'category': 'tax',
            'amount': shipping.taxAmount,
            'taxIncludedInBasePrice': 'false',
            'taxPayer': 'buyer'
        });
    }
    if (lineItems) {
        lineItems.forEach(function(lineItem) {
            lineItemBody = {
                additionalFees: []
            };
            lineItemBody.priceId = lineItem.priceId;
            lineItemBody.quantity = lineItem.quantity;
            if (lineItem.tax) {
                lineItem.tax.forEach(function(tax) {
                    lineItemBody.additionalFees.push({
                        'category': 'tax',
                        'taxIncludedInBasePrice': 'false',
                        'taxPayer': 'buyer',
                        'amount': tax.totalTax
                    });
                });
            }

            requestBody.data.lineItems.push(lineItemBody);
        });
    } else {
        requestBody.data.lineItems.push({});
    }

    return client.post('/priceQuotes/', JSON.stringify(requestBody), 'application/vnd.api+json', callback);
};
