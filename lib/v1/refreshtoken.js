'use strict';
var auth = require('../auth/auth.js');
/**
 *  The function Refresh Grant Token for existing SessionID
 *	@param {Object} req - req Object
 *	@param {Object} callback - callback object
 *  @return {Object} callback
 */
exports.refreshGrantToken = function(req, callback) {

    auth.refreshGrantTokenForSessionId(req.headers.sessionid, req.param('userExtKey'), function(err, result) {
        if (err) {
            return callback(err);
        }
        return callback(null, result);
    });

};
