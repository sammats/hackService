'use strict';

var httpsClient = require('https');
var logger = require('../utils/logger.js');
var ld = require('lodash-node');
var connectionAgent = require('config').connectionAgentOptions;
var Agent = require('agentkeepalive').HttpsAgent;

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
        agents[request.host] = new Agent(options);
    }
    return agents[request.host];
};

var logRequest = function(request, responseBody) {
    var message = 'Request to ' + logger.getHost(request);
    if (request.port) {
        message += ':' + request.port;
    }
    message += logger.getPath(request);
    if (request.body) {
        message += ' --- Request Body : ' + request.body;
    }
    message += ' --- Response Body : ' + responseBody;
    logger.debug(message, {'gtid': request.headers['X-Transaction-Ref']});
};

exports.request = function(request, callback) {
    logger.setStartTime(request);
    var timedout = false;
    request.agent = getAgent(request);

    var req = httpsClient.request(request, function(response) {

        response.setEncoding('utf-8');
        var responseBody = '';

        response.on('data', function(data) {
            responseBody += data;
        });

        response.on('error', function(e) {
            callback(e);
        });

        response.on('end', function() {
            logger.outgoingPayload(request, response, responseBody);

            if (response.statusCode !== 200 && response.statusCode !== 201) {
                logRequest(request, 'Call failed. Response status code : ' + response.statusCode);
                callback(new Error('Call failed. Status Code is ' + response.statusCode));
            } else {
                logRequest(request, responseBody);
                callback(null, responseBody);
            }
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
