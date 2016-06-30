'use strict';
var offeringsClient = require('../client/pelican/offerings.js'),
    offeringResponse = require('./offerings-response.js');

/**
 * Gets Pelican offering by product line
 * Returns offerings from a provided store, productLine, storeType, country combination
 */
exports.getOfferingsByProductLine = function(request, callback) {

    offeringsClient.getOfferingsByProductLine(
        request.query.store,
        request.query.productline,
        request.query.country,
        function(err, result) {

            if (err) {
                return callback(err);
            }

            return callback(null, offeringResponse.createOfferingsResponse(JSON.parse(result)));

        });

};
