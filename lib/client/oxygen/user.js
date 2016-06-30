'use strict';
var client = require('./oxygen_client.js');

exports.getUserProfile = function(req, callback) {
    client.get(req, callback);
};

exports.getHealthcheck = function(req, callback) {
    client.getHealthcheck(req, callback);
};
