'use strict';
var utilsResponse = require('./response.js');

exports.json = function(request, req, res) {
    this[request](req.params, function(err, json) {
        if (err) {
            return utilsResponse.sendResponse(res, 500, utilsResponse.getGenericErrorMessage(err.message));
        }
        return res.send(json);
    });
};

exports.redirect = function(request, req, res) {
    this[request](req.params, function(err, json) {
        //REDIRECT
    });
};
