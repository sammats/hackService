'use strict';
/* jshint -W040 */
var creditClient = require('../client/pelican/cloudcredits.js'),
    subscriptionClient = require('../client/pelican/subscription.js'),
    response = require('./domain/response.js'),
    async = require('async'),
    self = this;

/*
 * Finds Pelican Forex Offers
 * Returns Active CreditPackages
 */
exports.getCreditPackages = function(params, callback) {
    params['statuses'] = 'ACTIVE';
    creditClient.getCredits(params, function(err, result) {
        return err ? callback(err) : callback(null, response.CreditPackages(result.forexOffers));
    });
};

exports.getCreditPackagesByCurrency = function(params, callback) {
    this.getCreditPackages({fromCurrencyName: params.currencyCode}, callback);
};

/*
 * Finds Active Pelican Subscription Plans
 * Filtered by params.filters
 * Returns "Editions"
 */
exports.getEditions = function(params, callback) {
    params.statuses = 'ACTIVE';
    subscriptionClient.getPlans(params, function(err, result) {
        return err ? callback(err) : callback(null, response.Editions(result.subscriptionPlans));
    });
};

/*
 * Finds First Pelican Subscription Plan By "planExternalKey" = SubOfferExternalKey
 * Returns "Edition"
 */
exports.getEditionByPlanExtKey = function(params, callback) {
    this.getEditions({offerExternalKeys: params.planExtKey}, function(err, editions) {
        if (err) {
            return callback(err);
        }
        if (!editions.editions.length) {
            return callback(new Error('No Editions Found with Plan ExtKey=' + params.planExtKey));
        }
        return callback(null, editions.editions[0]);
    });
};

/*
 * Get Product Information
 * Get Credit Packages
 * Get EditionByPlanExtKey
 */
exports.getProductInformation = function(params, callback) {
    async.parallel({
        'creditPackages': function(cb) {
            self.getCreditPackages(params, cb);
        },
        'edition': function(cb) {
            self.getEditionByPlanExtKey(params, cb);
        }
    }, function(err, results) {
        return err ? callback(err) : callback(null, {
            'edition': results.edition,
            'creditPackages': results.creditPackages.creditPackages
        });
    });
};
