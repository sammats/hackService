'use strict';
var _ = require('lodash');

var cartValidation = function() {

    var errors = {
        11000: {
            'message': 'Adding multiple BIC subscriptions is not supported',
            'code': 11000,
            'priority': 10000,
            'action': 'setQuantityToOne',
            'lineItems': []
        },
        12000: {
            'message': 'Invalid item in cart. Item will be removed from cart',
            'code': 12000,
            'priority': 100,
            'action': 'remove',
            'lineItems': []
        },
        13000: {
            'message': 'Incompatible product offering types',
            'code': 13000,
            'priority': 1000,
            'action': 'userAction',
            'lineItems': []
        },
        14000: {
            'message': 'Incompatible subscriptions',
            'code': 14000,
            'priority': 1000,
            'action': 'userAction',
            'lineItems': []
        },
        15000: {
            'message': 'Cannot add maintenance subscription without perpetual product',
            'code': 15000,
            'priority': 1000,
            'action': 'remove',
            'lineItems': []
        }

    };

    this.getError = function(code, lineItems) {
        var error = errors[code];
        error.lineItems = lineItems;
        return error;
    };

    /**
     * Validates individual offering
     * @param offering cart item
     * @param cartItem cart item
     * @returns {Object} validation error
     */
    this.validateOffering = function(offering, cartItem, parentOffering) {

        var response;

        if (!offering) {

            response = this.getError(12000, [cartItem].productId);

        } else if (offering.offeringType === 'BIC_SUBSCRIPTION' && cartItem.quantity > 1) {

            response = this.getError(11000, [cartItem]);
        } else if (offering.offeringType === 'MAINTENANCE_SUBSCRIPTION' && !parentOffering) {

            response = this.getError(15000, [cartItem]);
        } else if (offering.offeringType === 'MAINTENANCE_SUBSCRIPTION' &&
            offering.productLine !== parentOffering.productLine) {

            response = this.getError(15000, [cartItem]);
        }

        return response;
    };

    /**
     * Validate card for existence of conflicting offering, where the user has to delete one of them
     * @param item1 offering to compare
     * @param item2 offering to compare
     * @returns {Object} validation error
     */
    this.mixedItemCheck = function(item1, item2) {

        var response;

        if ((item1.offeringType === 'PERPETUAL' &&
                (item2.offeringType === 'BIC_SUBSCRIPTION' || item2.offeringType === 'META_SUBSCRIPTION')) ||
                (item2.offeringType === 'PERPETUAL' &&
                (item1.offeringType === 'BIC_SUBSCRIPTION' || item1.offeringType === 'META_SUBSCRIPTION'))) {

            response = this.getError(13000, [item1, item2]);

        } else if ((item1.billingPeriod && item2.billingPeriod) &&
            (item1.billingPeriod !== item2.billingPeriod) ||
            (item1.billingPeriodCount && item2.billingPeriodCount) &&
            (item1.billingPeriodCount !== item2.billingPeriodCount)) {

            response = this.getError(14000, [item1, item2]);

        }

        return response;
    };
};

module.exports = new cartValidation();
