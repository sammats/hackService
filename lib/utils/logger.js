// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
'use strict';

var winston = require('winston');
var winstonConf = require('winston-config');
var logging = require('config').logging;
var utils = require('./util.js');
var filter = require('./filter.js');
var continuationLocalStorage = require('continuation-local-storage');
var getNamespace = continuationLocalStorage.getNamespace;
var transactionRefKey = 'X-Transaction-Ref';
var incomingString = 'incoming';
var outgoingString = 'outgoing';

/*
 Function responsible for logging request and response data on amart-application.log as an info log.
 */
exports.info = function(req, res) {

    req.body = filter.filter(req.body);
    res.body = filter.filter(res.body);

    connectToWinston('application', function(err, logger) {
        if (err) {
            return;
        }

        logger.info(createInfoEntry(req, res));
    });
};

/*
 Function responsible for logging request data, response data, errorcode and errormessage on amart-application.log as an error log.
 */
exports.error = function(req, res, errorcode, errormessage) {

    req.body = filter.filter(req.body);
    res.body = filter.filter(res.body);

    connectToWinston('application', function(err, logger) {
        if (err) {
            return;
        }

        logger.error(createErrorEntry(req, res, errorcode, errormessage));
    });
};

/*
 Function responsible for logging incoming payloads containing request data and response data on amart-payload.log as an info log.
 */
exports.incomingPayload = function(req, res, response) {
    payload(req, res, response, incomingString);
};

/*
 Function responsible for logging outgoing payloads containing request data and response data on amart-payload.log as an info log.
 */
exports.outgoingPayload = function(req, res, response) {
    payload(req, res, response, outgoingString);
};

/*
 Function responsible for logging messages on amart-application.log as a debug log.
 */
exports.debug = function(message, jsonMessage) {

    message = filter.filter(message);
    jsonMessage = filter.filter(jsonMessage);

    connectToWinston('application', function(err, logger) {
        if (err) {
            return;
        }

        logger.debug(createDebugEntry(message, jsonMessage));
    });
};

/*
 Function responsible for logging messages on amart-application.log as an error log.
 */
exports.errorMessage = function(errorcode, errormessage) {
    connectToWinston('application', function(err, logger) {
        if (err) {
            return;
        }

        logger.error(
            {
                'gtid': getGtidFromNamespace(),
                'errorcode': errorcode,
                'errormessage': errormessage
            }
        );
    });
};

/*
 Sets the start time and gtid on the request.
 */
exports.setInitialValues = function(req) {
    setStartTime(req);
    setGtid(req);
    setEndpoint(req);
};

exports.console = function() {
    return winston;
};

exports.getRequestEndpoint = getRequestEndpoint;
exports.setStartTime = setStartTime;
exports.getGtidFromNamespace = getGtidFromNamespace;
exports.getGtidFromHeaders = getGtidFromHeaders;
exports.getHost = getHost;
exports.getPath = getPath;

function setGtid(req) {
    if (!req.headers[transactionRefKey]) {
        req.headers[transactionRefKey] = createUid();
    }
}

function setEndpoint(req) {
    req.headers['endpoint'] = getRequestEndpoint(req);
}

function setStartTime(req) {
    req.start_time = Date.now();
}

function createInfoEntry(req, res) {
    var infoEntry = createEntry(req, res);

    return infoEntry;
}

function createEntry(req, res) {
    var entry = {
        gtid: getGtid(req),
        eid: createUid(),
        client: getClient(req),
        remote_address: utils.getIpAddress(req),
        // endpoint : getEndpoint(req),
        endpoint: req.headers['endpoint'],
        method: req.method.toUpperCase(),
        subject: getSubject(req),
        status_code: res ? res.statusCode : undefined,
        start_timestamp: req.start_time,
        duration: getDuration(req)
    };

    return entry;
}

function createDebugEntry(message, jsonMessage) {
    var gtId = getGtidFromNamespace();
    if (jsonMessage !== undefined && jsonMessage.gtid !== undefined) {
        gtId = jsonMessage.gtid;
        jsonMessage = undefined;
    }
    return {
        gtid: gtId,
        eid: createUid(),
        description: message,
        moreInfo: jsonMessage
    };
}

function getGtid(req) {
    var key = getGtidFromHeaders(req);

    if (key) {
        return key;
    } else {
        return getGtidFromNamespace();
    }
}

function getGtidFromHeaders(req) {
    return getFromHeaders(req, transactionRefKey);
}

function getFromHeaders(req, headerName) {
    return (req.headers ? req.headers[headerName] : null);
}

function getGtidFromNamespace() {
    var namespace = getNamespace('namespace');

    if (namespace) {
        return namespace.get('gtid');
    } else {
        return undefined;
    }
}

function createUid() {
    var ms = (new Date()).getTime().toString(),
        random = Math.floor(Math.random() * 100000).toString();

    return ms + '-' + random;
}

function getClient(req) {
    return getFromHeaders(req, 'user-agent');
}

function getRequestEndpoint(req) {
    return getFromHeaders(req, 'host') + req._parsedUrl.pathname;
}

function getEndpoint(req) {
    var namespace = getNamespace('namespace');

    if (namespace) {
        var endpoint = namespace.get('endpoint');
        if (endpoint) {
            return endpoint;
        }
    }

    return getRequestEndpoint(req);
}

function getSubject(req) {
    var subjectResponse = {};
    var subjects = logging.subjects;

    for (var s in subjects) {
        var subject = subjects[s];
        var param = (req.params ? req.params.subject : null);

        if (param) {
            subjectResponse[subject] = param;
        }
    }

    return subjectResponse;
}

function getDuration(req) {
    if (req && req.start_time) {
        return (Date.now() - req.start_time);
    } else {
        return null;
    }
}

function connectToWinston(type, callback) {
    winstonConf.fromJson(logging.types, function(error, winston) {
        if (error) {
            console.log('Error when trying to configure winston: ' + error); //Do not remove
            return callback(error);
        } else {
            var logger = winston.loggers.get(type);

            return callback(null, logger);
        }
    });
}

function createErrorEntry(req, res, errorcode, errormessage) {
    var errorEntry = createEntry(req, res);

    errorEntry.errorcode = errorcode;
    errorEntry.errormessage = errormessage;

    return errorEntry;
}

function payload(req, res, response, request_type) {
    req.body = filter.filter(req.body);
    res.body = filter.filter(res.body);

    connectToWinston('payload', function(err, logger) {
        if (err) {
            return;
        }

        logger.info(createPayloadEntry(req, res, response, request_type));
    });
}

function createPayloadEntry(req, res, response, request_type) {
    var entry = {
        gtid: getGtid(req),
        eid: createUid(),
        endpoint: getPayloadEndpoint(req, request_type),
        query_string: getQueryString(req),
        method: req.method.toUpperCase(),
        duration: getDuration(req),
        request_type: request_type,
        request_headers: req.headers,
        request_body: req.body,
        response_body: response,
        status_code: res ? res.statusCode : undefined
    };

    return entry;
}

function getPayloadEndpoint(req, requestType) {
    if (requestType === incomingString) {
        return getFromHeaders(req, 'endpoint');
    } else {
        return getHost(req) + getPath(req);
    }
}

function getHost(req) {
    return req.host ? req.host : req.hostname;
}

function getQueryString(req) {
    return req.query;
}

function getPath(req) {
    return req.path ? req.path : '/';
}
