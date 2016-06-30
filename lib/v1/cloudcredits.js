'use strict';
var creditsService = require('../client/pelican/cloudcredits.js');

/*  GET Cloud Credits data from Pelican.
 *  @param {Object} params - String Object
 *	@param {Object} callback
 *  @return {Object} callback
 */
exports.getCloudCredits = function(req, callback) {
    var params = creditsService.addCloudCreditParams(req, {});

    creditsService.getCredits(params, function(err, response) {
        if (err) {
            return callback(err);
        } else {
            var creditsResponse =  creditsService.setCreditsResponse(JSON.parse(response));
            callback(null, creditsResponse);
        }
    });
};
