'use strict';

var url = require('url');
var http = require('http');
var https = require('https');
var qs = require('querystring');
var Q = require('q');

/*
 *  Allow usage of promises with functions
 *  using the existing callback paradigm.
 *  @param {Object} obj - Object owner (for context)
 *  @param {Function} method - Method of object owner
 *  @param {*} args - Either a single argument or an array arguments to be passed into the method invocation
 *  @return {Promise} deferred.promise
 */
var promise = function(obj, method, args) {
    var fn = obj ? obj[method] : method,
        deferred = Q.defer();

    if (typeof fn !== 'function') {
        throw new Error('Method is not a function.');
    }

    var wrapped = function() {
        var args = Array.prototype.slice.call(arguments);
        var err = args[0];

        args.shift(); // Remove error from arguments

        // If arguments are multiple in length,
        // we have to resolve the promise with an array.
        // Otherwise resolve it with a single value.
        // Note: According to the Promises/A+ spec,
        // promises should only be resolved with a single value.
        if (args.length === 1) {
            args = args.pop();
        }

        if (!!err) {
            deferred.reject(new Error(err));
        } else {
            deferred.resolve(args);
        }
    };

    if (!args) {
        args = [];
    } else if (!Array.isArray(args)) {
        args = [args];
    }

    args.push(wrapped);

    fn.apply(obj, args);

    return deferred.promise;
};

/*
 *  Add deferreds/promises to the http request object to
 *  mimic the jQuery AJAX API.
 *  @param {Object} config - Config objectb
 *  @return {Promise} deferred.promise
 */
var request = function(config) {
    var data = config.data;
    var method = config.method;
    var urlString = config.url;
    var contentType = config.contentType;
    var headers = config.headers || {};
    var parsed = url.parse(urlString);
    var isHttps = parsed.protocol === 'https:' ? true : false;
    var net = isHttps ? https : http;
    var deferred = Q.defer();

    var requestBody,
        options,
        req;

    var buildRequestBody = function() {
        if (!data || method === 'GET') {
            return false;
        }

        var body;
        var contentHeader;

        var isObject = function(o) {
            return (!!o) && (o.constructor === Object);
        };

        // Always default to JSON if not specified
        switch (contentType) {
            case 'json':
                contentHeader = 'application/json';
                break;
            case 'xml':
                contentHeader = 'application/xml';
                break;
            case 'text':
                contentHeader = 'text/plain';
                break;
            case 'html':
                contentHeader = 'text/html';
                break;
            default:
                contentHeader = 'application/json';
        }

        // Only support JSON for now
        if (isObject(data) && contentHeader === 'application/json') {
            body = JSON.stringify(data);
        } else {
            body = data;
        }

        headers['Content-Type'] = contentHeader;
        headers['Content-Length'] = body.length;

        return body;
    };

    var buildOptions = function() {
        var queryString = data && method === 'GET' ? qs.stringify(data) : null;
        var path = parsed.path;
        var options = {};

        if (parsed.port) {
            options.port = parsed.port;
        } else if (isHttps) {
            options.port = 443;
        } else {
            options.port = 80;
        }

        if (queryString) {
            if (parsed.search) {
                path += '&' + queryString;
            } else {
                path += '?' + queryString;
            }
        }

        options.hostname = parsed.hostname;
        options.method = method;
        options.path = path;
        options.headers = headers;

        return options;
    };

    requestBody = buildRequestBody();
    options = buildOptions();

    req = net.request(options, function(res) {
        var responseData = '';
        var contentType = res.headers['content-type'];
        var isJson = /json/.test(contentType) ? true : false;

        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            responseData += chunk;
        });

        res.on('end', function() {
            // Convert the response into a JS object for ease of use
            if (isJson) {
                responseData = JSON.parse(responseData);
            }

            deferred.resolve(responseData);
        });

        res.on('error', function(err) {
            deferred.reject(new Error(err));
        });
    });

    // Write data to request body
    if (requestBody) {
        req.write(requestBody);
    }

    req.on('error', function(err) {
        deferred.reject(new Error(err));
    });

    req.end();

    return deferred.promise;
};

/*
 *  Returns a single promise that
 *  resolves only when the promises passed in are resolved.
 *  This simply normalizes the data that the
 *  individual promises are resolved with in the Q.settled method.
 *  The parameter in the done callback for the returned promise
 *  will be an array of all the resolved values for each promise (in order).
 *  @param {Array} promises
 *  @return {Promise} deferred.promise
 */
var multiple = function(promises) {
    var complete = Q.allSettled(promises);
    var deferred = Q.defer();
    var args = [];

    complete.done(function(results) {
        results.forEach(function(item, i, list) {
            if (item.state === 'fulfilled') {
                // Check if the value is an array, and
                // if so loop through the values and add to args
                if (Array.isArray(item.value)) {
                    item.value.forEach(function(v, j, l) {
                        args.push(v);
                    });
                } else {
                    args.push(item.value);
                }
            } else if (item.state === 'rejected') {
                args.push(item.reason);
            } else {
                args.push(null);
            }
        });

        deferred.resolve(args);
    });

    return deferred.promise;
};

module.exports = {
    promise: promise,
    http: request,
    multiple: multiple
};
