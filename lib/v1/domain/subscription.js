'use strict';
exports.properties = function(properties) {
    if (!properties || !properties.property) {
        return [];
    }
    var simpleProperties = {};

    properties = properties.property;
    if (!properties.length) {
        properties = [properties];
    }
    for (var i in properties) {
        var prop = properties[i];
        simpleProperties[prop.name] = prop.value;
    }
    return simpleProperties;
};

exports.prices = function(prices) {
    if (!prices || !prices.price) {
        return [];
    }

    var simplePrices = {};
    prices = prices.price;
    if (!prices.length) {
        prices = [prices];
    }
    for (var i in prices) {
        var price = prices[i];
        simplePrices[price.name] = price.amount;
    }
    return simplePrices;
};

exports.offer = function(offer) {
    var billingPeriods = {
        MONTH: 'MONTHLY',
        YEAR: 'ANNUALLY'
    };
    return {
        name: offer.name,
        externalKey: offer.externalKey,
        title: billingPeriods[offer.billingOption.billingPeriod.type],
        prices: this.prices(offer.billingOption.prices)
    };
};

exports.offers = function(offers) {
    if (!offers || !offers.subscriptionOffer) {
        return [];
    }

    var simpleOffers = [];
    offers = offers.subscriptionOffer;
    if (!offers.length) {
        offers = [offers];
    }
    for (var i in offers) {
        simpleOffers.push(this.offer(offers[i]));
    }
    return simpleOffers;
};

exports.plan = function(plan) {
    return {
        id: plan.id,
        name: plan.name,
        externalKey: plan.externalKey,
        usageType: plan.usageType,
        properties: this.properties(plan.properties),
        offers: this.offers(plan.subscriptionOffers)
    };
};

exports.entitlements = function(entitlements) {
    if (!entitlements || !entitlements.entitlement) {
        return [];
    }

    // we are concerned only about these two entitlement external keys.
    // these keys will help the CQ5 to populate the right prices based on the user selection.
    var entitlementExtkeys = {
        advancedsupport: 'advanced',
        basicsupport: 'basic'
    };

    var retVal;
    var arrEntitlements = entitlements.entitlement;

    for (var i in arrEntitlements) {
        var entitlementExtKey = arrEntitlements[i].externalKey;
        retVal = entitlementExtkeys[entitlementExtKey];
        if (retVal !== undefined) {
            break;
        } // once we have a match, exit the loop.
    }

    return retVal;

};

// this object is modified to fit the estore requirement.
// trimmed down the unwanted data that need to be sent over the wire to the public (anonymous) users.
exports.subscriptionPlan = function(plan) {
    return {
        id: plan.id,
        externalKey: plan.externalKey,
        offers: this.offers(plan.subscriptionOffers),
        isModule: plan.isModule,
        supportType: this.entitlements(plan.oneTimeEntitlements)
    };
};
