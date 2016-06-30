'use strict';
var _ = require('lodash');

/*
 * Create a formatted offerItem Object that conforms to CQ's requirements
 */

exports.createOfferingItem = function(offering, included) {

    var offeringItem;

    if (!offering) {
        return {};
    }

    offeringItem = {
        type: offering.offeringType,
        id: offering.id,
        externalKey: offering.externalKey,
        productLine: offering.productLine,
        name: offering.name,
        usageType: offering.usageType,
        platform: (offering.properties && offering.properties.platform) ? offering.properties.platform : undefined,
        supportLevel: offering.supportLevel,
        languages: offering.languages,
        offeringDetail: this.getOfferingDetail(offering, included)
    };

    if (offering.links) {

        if (offering.links.prices) {
            offeringItem.price = this.getPrice(offering, included);
        }

        if (offering.links.billingPlans) {
            offeringItem.billingPlans = this.getBillingPlans(offering, included);
        }
    }

    return offeringItem;
};

/*
 * Get Billing Plans from included object
 */

exports.getBillingPlans = function(offering, included) {

    var billingPlansLink, price, plan, billingPlansFormatted = [], billingPlan;

    if (offering.links && offering.links.billingPlans && offering.links.billingPlans.linkage && included) {
        billingPlansLink = offering.links.billingPlans.linkage;

        _.forEach(billingPlansLink, function(billingPlanLink) {

            billingPlan = _.find(included, {'type': 'billingPlan', 'id': billingPlanLink.id});

            plan = {
                billingPeriod: billingPlan.billingPeriod,
                billingPeriodCount: billingPlan.billingPeriodCount,
                billingCycleCount: billingPlan.billingCycleCount
            };

            price = _.find(included, {'type': 'price', 'id': billingPlan.links.prices.linkage[0].id});

            plan.price = {'priceId': price.id, 'amount': price.amount, 'currency': price.currency};
            billingPlansFormatted.push(plan);

        });

        return billingPlansFormatted;

    }

    return {};
};

/*
 * Get Offering Detail information from included object
 */

exports.getOfferingDetail = function(offering, included) {

    var offeringDetail;

    if (offering.links && offering.links.offeringDetail && offering.links.offeringDetail.linkage && included) {
        offeringDetail = _.find(included, {'type': 'offeringDetail', 'id': offering.links.offeringDetail.linkage.id});

        return {
            'name': offeringDetail.name,
            'externalKey': offeringDetail.externalKey,
            'taxCode': offeringDetail.taxCode
        };

    }

    return {};

};

/*
 * Get offering price from included object
 */

exports.getPrice = function(offering, included) {

    var price;

    if (offering.links && offering.links.prices && offering.links.prices.linkage && included) {
        price = _.find(included, {'type': 'price', 'id': offering.links.prices.linkage[0].id});
        return {'priceId': price.id, 'amount': price.amount, 'currency': price.currency};
    }

    return {};
};

/*
 * Create the correctly formatted offering response for CQ
 */

exports.createOfferingsResponse = function(offerings) {

    var offeringsResponse = {
        items: {}
    };

    if (!offerings) {
        return {};
    }

    _.forEach(
        offerings.data,
        function(offering) {

            var item = exports.createOfferingItem(offering, offerings.included);

            if (offeringsResponse.items[item.type]) {
                offeringsResponse.items[item.type].push(item);
            } else {
                offeringsResponse.items[item.type] = [item];
            }
        }
    );

    return offeringsResponse;

};
