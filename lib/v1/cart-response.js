'use strict';
var _ = require('lodash'),
    cartValidation = require('./cartValidation'),
    dbClient = require('../client/db_client.js');

/**
 * Determine if links.prices.ids contains priceId
 * @param links Array of linked objects form pelican offerings response
 * @param priceId priceId to lookup
 * @returns {boolean}
 */
exports.containsPriceId = function(links, priceId) {
    return Boolean(links && links.prices && links.prices.linkage && links.prices.linkage[0].id === priceId);
};

/**
 * Cycle through offerings in offerings.data
 * @param offerings array of offerings fmr Pelican
 * @param priceId priceId to lookup
 * @returns {*} return offering that has links to priceId or a billingPlan that links to priceId
 */
exports.findOfferingByPriceId = function(offerings, priceId) {
    if (!offerings.data.length) {
        return null;
    }
    return _.find(offerings.data, function(offering) {
        if (offering.links) {
            if (this.containsPriceId(offering.links, priceId)) {
                return true;
            }
            if (offering.links.billingPlans) {
                return _.some(offering.links.billingPlans.linkage, function(billingPlanId) {

                    var billingPlan = _.find(offerings.included, billingPlanId);
                    if (billingPlan && this.containsPriceId(billingPlan.links, priceId)) {
                        return true;
                    }
                }, this);
            }
        }
    }, this);
};

/**
 * Returns matched price amount
 * @param priceId Offering price id
 * @param linked Array of linked objects form pelican offerings response
 * @returns {Number} Price amount
 */

exports.getPrice = function(included, priceId) {

    var price = _.find(included, {type: 'price', id: priceId});
    return price && price.amount;

};

/**
 * Returns matched offering detail
 * @param offering Offering
 * @param included Array of linked objects form pelican offerings response
 * @returns {Object} Offer Detail
 */

exports.getOfferingDetail = function(offering, included) {

    var offeringDetail;

    if (offering && offering.links &&
        offering.links.offeringDetail &&
        offering.links.offeringDetail.linkage &&
        included) {
        offeringDetail = _.find(included, {'type': 'offeringDetail', 'id': offering.links.offeringDetail.linkage.id});

        return {
            'name': offeringDetail.name,
            'externalKey': offeringDetail.externalKey,
            'taxCode': offeringDetail.taxCode
        };

    }

    return {};

};

/**
 * Returns matched offering detail
 * @param included Array of linked objects form pelican offerings response
 * @param offering priceId
 * @returns {Object} Offer Detail
 */
exports.getBillingPlan = function(included, priceId) {

    return _.find(included, {
            'type': 'billingPlan',
            'links': {'prices': {'linkage': [{'type': 'price', 'id': priceId}]}}
        }) || {};

};

/**
 * Creates lineItem for offering, cartItem.productId is pelican priceId
 * @param offering offering from Pelican
 * @param offeringDetail offering detail for an offering
 * @param billingPlan billing plan for subscription offerings
 * @param price the price for the offering
 * @param cartItem cart item from cart stored in Redis
 * @returns {Object} Line item to include in cart response
 **/
exports.createLineItem = function(offering, offeringDetail, billingPlan, price, cartItem) {
    var lineItem;

    if (!offering || !price) {
        return null;
    }

    lineItem = {
        offeringId: offering.id,
        externalKey: offering.externalKey,
        offeringType: offering.offeringType,
        productLine: offering.productLine,
        taxCode: offeringDetail.taxCode,
        quantity: cartItem.quantity,
        unitPrice: price,
        calculatedPrice: (price * cartItem.quantity).toFixed(2),
        productId: cartItem.productId,
        mediaType: offering.mediaType,
        // from descriptors
        productName1: '',
        productName2: '',
        miniCartName1: '',
        miniCartName2: '',
        deliveryMethod: '',
        year: '',
        imageUrl: offering.descriptors.imageUrl,
        // from billing plan
        planType: '',
        parentProductId: cartItem.parentProductId || undefined,
        childProductId: cartItem.childProductId || undefined
    };

    if (billingPlan) {
        lineItem.billingPeriod = billingPlan.billingPeriod;
        lineItem.billingPeriodCount = billingPlan.billingPeriodCount;
        if (billingPlan.descriptors && billingPlan.descriptors.estore) {
            _.merge(lineItem, billingPlan.descriptors.estore);
        }
    }

    // Copy offering.descriptors.estore into cartLineItem
    if (offering.descriptors && offering.descriptors.estore) {
        _.merge(lineItem, offering.descriptors.estore);
    }

    return lineItem;

};

/**
 * Cycle through all cart items and find offering information, return object with updated lineItems
 * @param cart Cart from Redis
 * @param offerings Offerings from Pelican
 * @param callback Returns cart response
 * @returns callback with cart response
 */
exports.createCartResponse = function(cartId, cart, offerings, callback) {

    var shippableMediaTypes = ['DVD', 'USB'],
        cartResponse = {
            lineItems: [],
            promotions: cart.promotions || [],
            hasShipment: false,
            errors: []
        },
        updatedCartItems = [];

    cart.items.forEach(function(cartItem) {

        var offering = this.findOfferingByPriceId(offerings, cartItem.productId),
            price = this.getPrice(offerings.included, cartItem.productId),
            offeringDetail = this.getOfferingDetail(offering, offerings.included),
            parentOffering = this.findOfferingByPriceId(offerings, cartItem.parentProductId),
            error = cartValidation.validateOffering(offering, cartItem, parentOffering),
            billingPlan = this.getBillingPlan(offerings.included, cartItem.productId);

        if (error) {
            cartResponse.errors.push(error);
            if (error.action === 'setQuantityToOne') {
                cartItem.quantity = 1;
            }
        }

        if (!error || error.action !== 'remove') {

            updatedCartItems.push(cartItem);
            var lineItem = this.createLineItem(offering, offeringDetail, billingPlan, price, cartItem);

            cartResponse.lineItems.some(function(lineItem2) {
                var err = cartValidation.mixedItemCheck(lineItem, lineItem2);
                if (err) {
                    cartResponse.errors.push(err);
                    return true;
                }
            });

            cartResponse.lineItems.push(lineItem);

            if (!cartResponse.hasShipment) {
                cartResponse.hasShipment = shippableMediaTypes.indexOf(offering.mediaType) !== -1;
            }
        }

    }, this);

    cartResponse.lineItems = _.sortBy(cartResponse.lineItems, 'sortOrder');

    if (cartResponse.errors.length) {

        cart.items = updatedCartItems;

        dbClient.updateCart(cartId, cart, false, function(err) {
            return err ? callback(err) : callback(null, cartResponse);
        });

    } else {
        return callback(null, cartResponse);
    }

};
