'use strict';
var client = require('./payport_client.js');

/**
 * Retrieves tax information from Payport
 * @param {Object} params
 * @param {Object} params.body Tax request information
 * @param {String} params.gtid
 * @param callback
 */
exports.getTaxes = function(params, callback) {
    return client.post('/tax', params, callback);
};
