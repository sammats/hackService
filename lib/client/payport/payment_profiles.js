'use strict';

var client = require('./payport_client.js');

/*  GET Payment Profile data for a user from PSP Handler.
 *  @param {Object} userExternalKey - String Object
 *	@param {Object} callback
 *  @return {Object} request - Request Object
 */
exports.getPaymentProfiles = function(userExternalKey, queryParams, params, callback) {
    return client.get('/user/' + userExternalKey + '/paymentProfiles?' + queryParams, params, callback);
};
/*  ADD/POST Payment Profile data for a user to PSP Handler.
 *  @param {Object} req - String Object
 *	@param {Object} callback
 *  @return {Object} request - Request Object
 */
exports.addPaymentProfile = function(req, callback) {
    var uri = createURIForAddOrUpdate(req);

    return client.post(uri, {body: req.body, gtid: req.headers['X-Transaction-Ref']}, callback);
};
/*  UPDATE/PUT Payment Profile data for a user to PSP Handler.
 *  @param {Object} req - String Object
 *	@param {Object} callback
 *  @return {Object} request - Request Object
 */
exports.updatePaymentProfile = function(req, callback) {
    var uri = createURIForAddOrUpdate(req);

    return client.put(uri, {body: req.body, gtid: req.headers['X-Transaction-Ref']}, callback);
};

exports.getHealthcheck = function(req, callback) {
    client.getHealthcheck(req, callback);
};

function createURIForAddOrUpdate(req) {
    var userExternalKey = req.param('userExtKey');
    var uri = '/user/' + userExternalKey + '/paymentProfiles?syncUCM=1';
    return uri;
}
