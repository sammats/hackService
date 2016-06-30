'use strict';
var client = require('./pelican_client.js');

exports.addSubscription = function(params, callback) {
    return client.post('/subscription', params, callback);
};

/**********************************************************************************************************
 Function    : getPlans

 @param {Object} req - request object containing Product Line identifier
 @param {Object} callback - callback object
 @return {Object} callback

 Description : This will make a call to the pelican restful API "Find Subscription Plans" service end-point.
 This will fetch the subscription plans based on the filtering criteria passed as "params"

 ***********************************************************************************************************/

exports.getPlans = function(params, callback) {
    return client.get('/subscriptionPlans', params, callback);
};
