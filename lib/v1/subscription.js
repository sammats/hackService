'use strict';
var pelicanService = require('../client/pelican/subscription.js'),
    subscription = require('./domain/subscription.js'),
    utilsResponse = require('../utils/response.js'),
    express = require('express'),
    app = express();

/**
 * Creates a subscription on Pelican by making a POST to Pelican Rest API (/subscription).
 * If there is an error, returns a callback with the Error
 *
 *	@param {Object} req - The request received containing 'userExtKey' and 'usageType' parameters inside
 *	@param {Object} callback - The callback function
 *  @return {Object} the callback will return the response or error in case of an error.
 */
exports.createSubscription = function(req, callback) {
    var strParams = 'userExternalKey=' +
        req.param('userExtKey') +
        '&subscriptionOfferExternalKey=' +
        req.param('usageType');

    pelicanService.addSubscription(strParams, function(err, subscriptionResponse) {
        var response = {};

        if (err) {
            return callback(err);
        } else {
            try {
                response = utilsResponse.setSubscriptionResponse(subscriptionResponse);
            } catch (error) {
                return callback(error);
            }

            if (app.get('env') === 'development') {
                console.log('****************************************************************************************');
                console.log('createSubscription: RESPONSE');
                console.log(response);
                console.log('****************************************************************************************');
            }

        }

        callback(null, response);
    });
};

/**********************************************************************************************************
 Function    : getActiveCommercialPlansByProductLine

 @param {Object} params - request object containing Product Line identifier
 @param {Object} callback - callback object
 @return {Object} callback

 Description : This function was added as a part of eStore requirement.
 This will fetch the subscription plans that are Active and Commercial based on the
 product line identifier.
 The data was trimmed down to display on the eStore for anonymous users.

 ***********************************************************************************************************/
exports.getActiveCommercialPlansByProductLine = function(params, callback) {

    pelicanService.getPlans({
        status: 'ACTIVE',
        usageType: 'COM',
        productLine: params.productLine
    }, function(err, result) {
        // application runtime error
        if (err) {
            return callback(err);
        }

        //cache the result
        var subscriptionPlans = result.subscriptionPlans;

        //business error. Need to fine tune error handling using domains and/or event emitters.
        if (!subscriptionPlans || !subscriptionPlans.subscriptionPlan) {
            return callback(new Error('No active commercial plans found for the product line : ' + params.productLine));

        }

        var arrSubscriptionPlans = subscriptionPlans.subscriptionPlan.map(
            subscription.subscriptionPlan.bind(subscription));

        return callback(null, arrSubscriptionPlans.filter(function(x) {
                if (x.isModule === 'false') { // we need only non-modules for product configurator in CQ5

                    // remove this attribute from the resulting JSON object.
                    delete x.isModule;

                    // Also remove offer name and CAD price from the response.
                    x.offers.filter(function(offer) {
                            delete offer.name;
                            delete offer.prices.CAD;
                            return offer;
                        }
                    );

                    return x; // return the resultant JSON object.
                }//end if
            })
        ); // end callback
    });
};
