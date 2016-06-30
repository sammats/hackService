'use strict';
var client = require('./pelican_client.js');

/**********************************************************************************************************
 Function    : getStore

 @param {Object} extStoreKey - the external Store identifier
 @param {Object} callback - callback object
 @return {Object} callback

 Description : This will make a call to the pelican restful API "Find Store by ID" service end-point.
 This will fetch the store based on store id passed as "params"

 ***********************************************************************************************************/

exports.getStore = function(extStoreKey, callback) {
    var params = {'filter[externalKey]': extStoreKey};
    return client.get('/store/', params, callback);
};
