'use strict';
var http = require('http');
var https = require('https');
var parseString = require('xml2js').parseString;
var logger = require('../utils/logger.js');
var util = require('../utils/util.js');
var ld = require('lodash-node');
var connectionAgent = require('config').connectionAgentOptions;
var Agent = require('agentkeepalive');

var agents = {};
var getAgent = function(request) {
    if (!agents[request.host]) {
        var options = ld.cloneDeep(connectionAgent);
        if (request.pfx) {
            options.pfx = request.pfx;
            options.passphrase = request.passphrase;
        }
        if (request.rejectUnauthorized === false) {
            options.rejectUnauthorized = false;
        }
        agents[request.host] = (!util.isValid(request.useHttp) || request.useHttp === 'true') ? new Agent(options) :
            new Agent.HttpsAgent(options);
    }
    return agents[request.host];
};

var buildParams = function(prefix, obj, add) {
    var name, i, l, rbracket;
    rbracket = /\[\]$/;
    if (obj instanceof Array) {
        for (i = 0, l = obj.length; i < l; i++) {
            if (rbracket.test(prefix)) {
                add(prefix, obj[i]);
            } else {
                buildParams(prefix + '[' + (typeof obj[i] === 'object' ? i : '') + ']', obj[i], add);
            }
        }
    } else if (typeof obj === 'object') {
        // Serialize object item.
        for (name in obj) {
            buildParams(prefix + '[' + name + ']', obj[ name ], add);
        }
    } else {
        // Serialize scalar item.
        add(prefix, obj);
    }
};

var objectToQueryString = function(a) {
    var prefix, s, add, name, r20, output;
    s = [];
    r20 = /%20/g;
    add = function(key, value) {
        // If value is a function, invoke it and return its value
        value = (typeof value === 'function') ? value() : (value === null ? '' : value);
        s[ s.length ] = encodeURIComponent(key) + '=' + encodeURIComponent(value);
    };
    if (a instanceof Array) {
        for (name in a) {
            add(name, a[name]);
        }
    } else {
        for (prefix in a) {
            buildParams(prefix, a[ prefix ], add);
        }
    }
    output = s.join('&').replace(r20, '+');
    return output;
};

exports.paramsToQuery = function(params) {
    var query = objectToQueryString(params);
    return query;
};

exports.getURL = function(url, params) {
    if (!params) {
        return url;
    }
    return url + '?' + this.paramsToQuery(params);
};

/*
 * Creates an http request object from config file
 */
exports.generateBasicRequest = function(method, config) {
    return {
        useHttp: config.useHttp,
        hostname: config.hostname,
        port: config.port,
        path: config.path,
        method: method,
        headers: {}
    };
};

var logRequest = function(request, responseBody) {
    var message = 'Request to ' + logger.getHost(request);
    if (request.port) {
        message += ':' + request.port;
    }
    message += logger.getPath(request);
    if (request.body) {
        message += 'Request Body: ' + request.body;
    }
    message += 'Response Body: ' + responseBody;
    logger.debug(message, {'gtid': request.headers['X-Transaction-Ref']});
};

exports.request = function(request, callback) {
    logger.setStartTime(request);
    var protocol = getProtocol(request);
    var timedout = false;
    request.agent = getAgent(request);

    var req = protocol.request(request, function(response) {

        response.setEncoding('utf-8');
        var responseBody = '';

        response.on('data', function(data) {
            responseBody += data;
        });

        response.on('error', function(e) {
            return callback(e);
        });

        response.on('end', function() {
            logRequest(request, responseBody);
            logger.outgoingPayload(request, response, responseBody);

            var options = {
                mergeAttrs: true,
                explicitArray: false},
                contentType = response.headers['content-type'];
            //If the response is a JSON or text, just return it without parsing
            if (util.isValid(contentType) &&
                (contentType === 'application/json' ||
                contentType === 'application/vnd.api+json' ||
                contentType === 'text/plain' ||
                contentType === 'application/vnd.api+json' ||
                contentType.indexOf('text/html') !== -1)) {
                return callback(null, responseBody);
            }

            //If the response is XML, parse it to JSON
            parseString(responseBody, options, function(err, result) {
                if (err || !util.isValid(response)) {
                    return callback(new Error('Problem converting XML: ' + responseBody + ' to JSON'));
                }
                if (result.error) {
                    return callback(new Error('API ERROR: ' + JSON.stringify(result.error)));
                }
                return callback(null, result);
            });
        });
    });
    if (!ld.isNull(request.timeout) && !ld.isUndefined(request.timeout)) {
        req.setTimeout(request.timeout, function() {
            timedout = true;
            req.destroy();
            logger.outgoingPayload(request, {'statusCode': '504'}, 'Call Timeout making an API Request');
            logRequest(request, 'Call Timeout making an API Request');
            return callback(new Error('Call Timeout making an API Request'));
        });
    }

    req.on('socket', function(socket) {
        if (!socket.name) {
            socket.name = new Date().getTime();
            logger.debug('SOCKET CREATED ' + socket.name + ' FOR REQUEST: ' + request.host + request.path);
            socket.on('close', function() {
                logger.debug('SOCKET ' + socket.name + ' CLOSED');
            });
        }
    });

    req.on('error', function(e) {
        if (!timedout) {
            logger.outgoingPayload(request, {'statusCode': '500'}, e.message);
            logRequest(request, e.message);
            return callback(e);
        }
    });

    if (request.body) {
        req.write(request.body);
    }
    req.end();
};

function getProtocol(request) {
    if (!util.isValid(request.useHttp) || request.useHttp === 'true') {
        return http;
    } else {
        return https;
    }
}
