'use strict';
var client = require('./ucm_client.js');

exports.getBillingProfiles = function(oxygenId, gtid, callback) {
    client.post(oxygenId, gtid, callback);
};
