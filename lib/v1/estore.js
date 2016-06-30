'use strict';
/* jshint -W040 */
var service = this;

exports.filterResponse = function(json) {
    var filter = function(key, value) {
        if (key === 'jsonRef') {
            return undefined;
        }
        return value;
    };
    return JSON.parse(JSON.stringify(json, filter));
};

exports.generateCallback = function(req, res) {
    return function(err, json) {
        res.header('Content-Type', 'application/json');
        if (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            return res.status(err.statusCode).send({'error': {'message': err.message, 'code': '100'}});
        }
        var response = {};
        var rootIndex = json && json.jsonRef ? json.jsonRef : null;
        var filteredJson = service.filterResponse(json);
        if (rootIndex) {
            response[rootIndex] = filteredJson;
        } else {
            response = filteredJson;
        }
        var statusCode = json.statusCode ? json.statusCode : (req.method === 'POST' ? 201 : 200);
        return res.status(statusCode).send(response);
    };
};
/*
 * TODO: Implement
 * Validate Schema
 */
exports.validateRequest = function(req, callback) {
    return callback(null, true);
};

/*
 * Validate Security
 * TODO: Implement
 */
exports.validateAuthorizedRequest = function(req, callback) {
    return callback(null, true);
};

/*
 * Validates Request
 * Uses Callback to return err response or json output
 */
exports.handleRequest = function(restMethod, req, res) {
    var self = this;
    var callback = service.generateCallback(req, res);
    //Make sure we have a valid restMethod to call
    if (!restMethod) {
        return callback(new Error('Invalid REST Method Specified'));
    }

    //Validate request
    service.validateRequest(req, function(err, isValid) {
        if (err) {
            return callback(err.getRequestError('Unable to validate request', null, err));
        }

        //Prepare arguments to call restMethod with
        var args = [req.params];
        //Check if restMethod takes in req.body, if so get Request object from req.body
        if (restMethod.length === 3) {
            try {
                service.addIPAddressToRequestBody(req);
                var requestObject = req.getRequestFromBody(req.body);
                if (!requestObject) {
                    return callback(err.getRequestError('Unable to convert to Request Object'));
                }
                args.push(requestObject);
            } catch (e) {
                return callback(err.getRequestError('Unable to convert to Request Object: ' + e.message));
            }
        }
        args.push(callback);

        //Call restMethod
        restMethod.apply(self, args);
    });
};

/*
 * Validates Authorized Request
 * Calls Handle Request
 */
exports.handleSecureRequest = function(restMethod, req, res) {
    service.validateAuthorizedRequest(req, function(err, validated) {
        if (err) {
            return res.statusCode(403).send({'error': {'message': 'Authorization not valid', 'code': '200'}});
        }
        return service.handleRequest(restMethod, req, res);
    });
};
