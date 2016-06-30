'use strict';
/*
 * Converts API Responses into appropriate json objects for output
 */
var util = require('../../utils/util.js');
exports.CreditPackages = function(response) {
    return new CreditPackages(response);
};

exports.Editions = function(response) {
    return new Editions(response);
};

/*
 * Takes in Pelican ForexOffers response
 * Returns CreditPackages
 */
function CreditPackages(response) {
    this.init(response);
}
CreditPackages.prototype = {
    init: function(response) {
        this.creditPackages = {};
        this.addPackages(util.forceArray(response.forexOffer));
    },
    addPackages: function(offers) {
        offers.forEach(function(offer, index, array) {
            this.addPackage(offer);
        }, this);
    },
    addPackage: function(offer) {
        var creditPackage = new CreditPackage(offer);
        this.creditPackages[creditPackage.price.currencyCode] = creditPackage;
    }
};

/*
 * Takes in Pelican ForexOffer response
 * Returns CreditPackage
 */
function CreditPackage(response) {
    this.init(response);
}
CreditPackage.prototype = {
    init: function(response) {
        this.jsonRef = 'creditPackage';
        this.name = response.toCurrency.description;
        this.externalKey = response.externalKey;
        this.units = response.preferredToAmount;
        this.description = response.description;
        this.taxCode = response.toCurrency.taxCode;
        this.price = {
            currencyCode: response.fromCurrency.name,
            amount: response.preferredFromAmount
        };
    }
};

/*
 * Takes in Pelican Subscription Plans
 * Takes in "Plan" external key, which filtered Pelican SubOffers by their externalKey
 * Returns "Editions"
 */
function Editions(response) {
    this.init(response);
}
Editions.prototype = {
    init: function(response) {
        this.editions = [];
        this.addEditions(util.forceArray(response.subscriptionPlan));
    },
    addEditions: function(editions) {
        editions.forEach(function(edition) {
            this.addEdition(edition);
        }, this);
    },
    addEdition: function(edition, planExtKey) {
        this.editions.push(new Edition(edition));
    }
};

/*
 * Takes in Pelican Subscription Plan
 * Takes in "Plan" external key, for filtering Pelican SubOffers
 * Returns "Edition"
 */
function Edition(response) {
    this.init(response);
}
Edition.prototype = {
    init: function(response) {
        this.jsonRef = 'edition';
        this.displayName = response.buttonDisplayName;	//Currently we use buttonDisplayName as subplan display name
        this.name = response.name;
        this.shortDesc = response.shortDescription;
        this.longDesc = response.longDescription;
        this.smallImage = response.smallImageURL;
        this.mediumImage = response.mediumImageURL;
        this.largeImage = response.largeImageURL;
        this.usageType = response.usageType;
        this.productLine = response.productLine.name;
        this.isModule = response.isModule === 'true';
        this.taxCode = response.taxCode;
        this.entitlements = [];
        this.addEntitlements(util.forceArray(response.oneTimeEntitlements.entitlement));
        this.plans = [];
        this.addPlans(util.forceArray(response.subscriptionOffers.subscriptionOffer));
        this.supportType = this.determineSupportType();
        this.addHideCreditFlag(response.properties);
    },
    addPlans: function(plans) {
        plans.forEach(function(plan) {
            this.addPlan(plan);
        }, this);
    },
    addPlan: function(plan) {
        this.plans.push(new Plan(plan));
    },
    addEntitlements: function(entitlements) {
        entitlements.forEach(function(entitlement) {
            this.addEntitlement(entitlement);
        }, this);
    },
    addEntitlement: function(entitlement) {
        this.entitlements.push(entitlement.externalKey);
    },
    determineSupportType: function() {
        var supportExternalKey = util.arrayFind(this.entitlements, function(value) {
            return value.indexOf('support') !== -1;
        });
        return supportExternalKey ? supportExternalKey.replace('support', '') : 'basic';
    },
    addHideCreditFlag: function(properties) {

        var hideCredits;
        if (!properties || !properties.property) {
            hideCredits = true; // default
        }
        var propertyArr = util.getAsArray(properties.property);

        var filteredArray = propertyArr.filter(function(property) {
            return (property.name === 'hideCredits');
        });

        if (filteredArray.length !== 0 && filteredArray[0].value === 'false') {
            hideCredits = false;
        } else {
            hideCredits = true;
        }

        this.hideCredits = hideCredits;
    }
};

/*
 * Takes in Pelican Subscription Offer
 * Returns "Plan"
 */
function Plan(response) {
    this.init(response);
}
Plan.prototype = {
    init: function(response) {
        this.jsonRef = 'plan';
        this.name = response.name;
        this.externalKey = response.externalKey;
        var billingOption = response.billingOption;
        this.recurringPeriod = billingOption.billingPeriod.type;
        this.recurringFrequency = billingOption.billingPeriod.count;
        this.prices = [];
        this.addPrices(util.forceArray(billingOption.prices.price));
    },
    addPrices: function(prices) {
        prices.forEach(function(price) {
            this.prices.push({currencyCode: price.name, amount: price.amount});
        }, this);
    }
};
