'use strict';
var userService = require('../client/pelican/user.js');

exports.getByExternalKey = function(params, callback) {
    userService.getByExternalKey(params.extKey, function(err, result) {
        if (err) {
            return callback(err);
        }
        return callback(null, result.user);
    });
};

exports.getActiveSubscriptions = function(params, callback) {
    this.getByExternalKey(params, function(err, user) {
        if (err) {
            callback(err);
        }
        userService.getActiveSubscriptions(params.extKey, function(err, result) {
            if (err) {
                return callback(err);
            }
            var subscriptions = result.subscriptions.subscription;
            if (!subscriptions.length) {
                subscriptions = [subscriptions];
            }
            return callback(null, subscriptions);
        });

    });
};

exports.getCatalog = function(params, callback) {
    userService.getCatalog(params, function(err, result) {
        if (err) {
            return callback(err);
        }
        return callback(null, result);
    });
};
