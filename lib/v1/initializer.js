'use strict';
/* jshint -W040 */
var oxygenService = require('../client/oxygen/user.js'),
    creditsService = require('../client/pelican/cloudcredits.js'),
    pelicanService = require('../client/pelican/user.js'),
    _ld = require('lodash-node'),
    utils = require('../utils/util.js'),
    async = require('async'),
    logger = require('../utils/logger.js'),
    ucmBillingProfiles = require('./ucmbillingprofiles.js');

/*
 Gets the initial Data to be sent on initializer call.

 This function will always call the user profile from oxygen amd the billing profiles from UCM.
 If the req.query contains an fx == 'CLDCR', also calls the cloud credits from Pelican.
 If the req.query does not contain an fx == 'CLDCR', also calls the catalog from Pelican.

 All these call are made in parallel.
 */
exports.getInitialData = function(req, callback) {
    var cloudCreditsOnly = mustReturnCloudCreditsOnly(req);
    var params = {};
    var parallelFunctions = {
        getUserProfile: getUserProfile.bind(req),
        getUCMBillingProfiles: getUCMBillingProfiles.bind(req)
    };

    if (cloudCreditsOnly) {
        creditsService.addCloudCreditParams(req, params);
        parallelFunctions.getCloudCredits = getCloudCredits.bind(params);
    } else {
        addCatalogParams(req, params);
        parallelFunctions.getCatalog = getCatalog.bind(params);
    }

    //Make the calls in parallel and create the response if all of them are successful
    async.parallel(parallelFunctions,
        function(err, results) {
            if (err) {
                return callback(err);
            }

            console.log(results);
            var response = {};
            response.user = {};
            response.user.addons = [];

            addUCMDataToResponse(results['getUCMBillingProfiles'], req, response);

            addEmailAddressToResponse(results['getUserProfile'], results['getUCMBillingProfiles'], response);

            console.log(response);

            if (cloudCreditsOnly) {
                addCreditPackagesDataToResponse(results['getCloudCredits'], response);
                response.user.editions = [];
                response.user.noncommercial = [];
            } else {
                addCatalogDataToResponse(results['getCatalog'], response);
                response.user.creditpackages = [];
            }

            return callback(null, response);
        });
};

function mustReturnCloudCreditsOnly(req) {
    if (req.query.subId || req.query.offeringId) {
        return false;
    } else {
        return (req.query.fx && req.query.fx === 'CLDCR');
    }
}

function addCatalogParams(req, params) {
    params.extKey = req.query.userId;
    params.subId = req.query.subId;
    params.offeringId = req.query.offeringId;
    params.gtid = req.headers['X-Transaction-Ref'];
    params.storeType = req.query.storeType;
    if (!params.country) {
        params.country = req.query.country;
    }
}

function getCatalog(callback) {
    pelicanService.getCatalog(this, function(err, catalogResponse) {
        return callback(err, catalogResponse);
    });
}

function getUserProfile(callback) {
    oxygenService.getUserProfile(this, function(err, oxygenResponse) {
        return callback(err, JSON.parse(oxygenResponse));
    });
}

function getCloudCredits(callback) {
    creditsService.getCredits(this, function(err, creditResponse) {
        creditResponse = (_ld.isString(creditResponse)) ? JSON.parse(creditResponse) :  creditResponse;
        return callback(err, creditResponse);
    });
}

function getUCMBillingProfiles(callback) {
    ucmBillingProfiles.getUCMBillingProfiles(this.query.userId,
        this.query.country,
        this.headers['X-Transaction-Ref'],
        function(err, ucmResponse) {
        if (err) {
            return callback(null, null);
        } else {
            return callback(null, ucmResponse);
        }
    });
}

function addUCMDataToResponse(result, req, response) {
    if (result) {
        response.user.country = result.country === '' ? req.query.country : result.country;
        response.user.paymentProfiles = result.paymentProfiles;
    } else {
        response.user.country = req.query.country;
        response.user.paymentProfiles = [];
    }
}

function addEmailAddressToResponse(oxygenData, UCMData, response) {
    response.user.email = ((UCMData && UCMData.emailAddress && UCMData.emailAddress.trim() !== '') ?
        UCMData.emailAddress : oxygenData.user.Email);
}

function getProductDisplay(plan) {
    var product = {},
        descriptor = getCatalogDescriptor(plan.descriptors),
        prop = getPlanProperties(plan);
    product.displayname = (descriptor) ? descriptor.productName1 : plan.productLine.name;
    product.imagesm = (descriptor) ? descriptor.imageUrl : plan.smallImageURL;
    product.estoreLink = (_ld.has(prop, 'buyLink')) ? prop.buyLink : !!'';
    return product;
}

function getPlanProperties(plan) {
    var props = {};
    if (plan.properties && plan.properties.property) {
        var properties = utils.getAsArray(plan.properties.property);
        /* jshint -W083 */
        _ld.forEach(properties, function(v) {
            props[v.name] = v.value;
        });
        /* jshint +W083 */
    }
    return props;
}

function addCatalogDataToResponse(result, response) {
    var product = {},
        editions = [],
        noncommercial = [],
        currency = utils.getCurrency(response.user.country),
        estoreLink = '',
        subPlans = utils.getAsArray(result.catalog.upgradeOfferings.subscriptionPlan);
    var i,
        iLen = subPlans.length;
    for (i = 0; i < iLen; i++) {
        var subPlan = subPlans[i];
        var prop = getPlanProperties(subPlan);
        var edition = {};

        if (!utils.checkUserCountrySupported(response.user.country)) {
            product = getProductDisplay(subPlan);
            break;
        }

        edition.name = subPlan.buttonDisplayName;
        edition.shortDecsription = subPlan.shortDescription;
        edition.longDescription = subPlan.longDescription;
        edition.productImageLarge = subPlan.largeImageURL;
        edition.productImageMedium = subPlan.mediumImageURL;
        edition.productImageSmall = subPlan.smallImageURL;
        edition.descriptor = getCatalogDescriptor(subPlan.descriptors);
        if (!_ld.isEmpty(prop)) {
            edition.subscriptionInfo = (_ld.has(prop, 'subscriptionPlanInfo')) ? prop.subscriptionPlanInfo : '';
            edition.hideCloudCredits = (_ld.has(prop, 'hideCredits')) ? prop.hideCredits : !!'';
            estoreLink = (_ld.has(prop, 'buyLink')) ? prop.buyLink : !!'';
        }

        // create the product object once
        if (_ld.isEmpty(product)) {
            product = getProductDisplay(subPlan);
        }

        var subPlanTaxCode = subPlan.offeringDetail.taxCode;
        var subOffers = utils.getAsArray(subPlan.subscriptionOffers.subscriptionOffer);
        var plans = [];
        var j,
            jLen = subOffers.length;
        for (j = 0; j < jLen; j++) {
            var subOffer = subOffers[j];

            var plan = {};
            plan.productId = subOffer.externalKey;
            plan.price = [];

            plan.descriptor = getCatalogDescriptor(subOffer.descriptors);

            if (subPlan.usageType === 'COM') {
                var subOfferName = (plan.descriptor.billingPlan) ? plan.descriptor.billingPlan : subOffer.name;
                plan.title = subOfferName;
                plan.name = subOfferName;

                var price = subOffer.prices.price;
                var planPrice = {};
                if (currency && currency === price.name) {
                    planPrice.priceId = price.id;
                    planPrice.name = price.name;
                    planPrice.currencyCode = price.currency;
                    planPrice.amount = price.amount;
                    planPrice.taxcode = subPlanTaxCode;
                    planPrice.taxtype = 'SUBSCRIPTION';
                    plan.price.push(planPrice);
                }
                if (plan.price.length) {
                    plans.push(plan);
                }
            } else {
                //jscs:disable maximumLineLength
                plan.title = (plan.descriptor && plan.descriptor.billingPlan) ? plan.descriptor.billingPlan : subOffer.name;
                //jscs:enable maximumLineLength
                edition.usageType = subPlan.usageType;
                plans.push(plan);
            }
        }
        edition.plans = plans;

        if (subPlan.usageType === 'COM') {
            if (edition.plans.length) {
                editions.push(edition);
            }
        } else if (subPlan.usageType === 'EDU' || subPlan.usageType === 'NCM') {
            noncommercial.push(edition);
        }
    }

    response.user.product = product;
    response.user.editions = editions;
    response.user.noncommercial = noncommercial;
}

function getCatalogDescriptor(descriptorLink) {
    var planDescriptor = {};
    var headerDescriptor = utils.getAsArray(descriptorLink.descriptor);
    setDescriptors(headerDescriptor, planDescriptor);
    var descriptors = utils.getAsArray(descriptorLink.group);
    var groupArray = utils.arrayFind(descriptors, function(value) {
        return (value.name === 'ipp');
    });
    setDescriptors(groupArray.descriptor, planDescriptor);
    return planDescriptor;
}

function setDescriptors(descriptor, planDescriptor) {
    var j,
        jLen = descriptor.length;
    if (descriptor.length > 0) {
        for (j = 0; j < jLen; j++) {
            var hDescriptor = descriptor[j];
            planDescriptor[hDescriptor.name] = (hDescriptor._) ? hDescriptor._ : '';
        }
    }
}

function addCreditPackagesDataToResponse(result, response) {
    // get the creditpackages
    // add the credit packages to response.user.creditpackages >> this is an array of objects
    var product = {};
    var creditPackages = [];
    var creditPackage = creditsService.setCreditsResponse(result);
    creditPackages.push(creditPackage);
    response.user.creditpackages = creditPackages;
    // get the properties
    // add properties to response.user.product >> This is an object
    var credit = result.data[0];
    var prop = getPlanProperties(credit);

    // jscs:disable maximumLineLength
    if (!_ld.isEmpty(credit.descriptors)) {
        // create the product object once
        if (_ld.isEmpty(product)) {
            product.displayname = (credit.descriptors.productName1) ? credit.descriptors.productName1 :
                (credit.descriptors.ipp && credit.descriptors.ipp.productName1) ? credit.descriptors.ipp.productName1 : '';
            product.imagesm = (credit.descriptors.imageUrl) ? credit.descriptors.imageUrl : !!'';
            product.estoreLink = (credit.descriptors.buyLink) ? credit.descriptors.buyLink : !!'';
        }
    }

    response.user.product = product;
}
