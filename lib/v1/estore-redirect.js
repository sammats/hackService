'use strict';
var utils = require('../utils/util.js'),
    auth = require('../auth/auth.js');

/**
 *  The function redirects the user to the cloud credits page with offerExternalKey. No Session will be created.
 *  @param {Object} req - req Object
 *	@param {Object} callback - callback object
 *  @return {Object} callback
 */
exports.processRedirect = function(req, callback) {
    var response = {};
    var err;

    response.user = {};
    response.user.offerExtKey = req.query['offerExtKey'];

    callback(null, response);
};

// The below will be required only when there is an authentication step involved during redirect in the route.
/**
 *  The function Creates the user session after the user has been logged in.
 *  @param {Object} req - req Object
 *	@param {Object} callback - callback object
 *  @return {Object} callback
 */
/*exports.processRedirectAfterLogin = function(req,callback) {
 var response = {};
 var err;

 response.user = {};
 response.user.offerExtKey = req.query['offerExtKey'];

 callback(null, response);
 };*/
