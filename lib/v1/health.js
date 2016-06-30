'use strict';
var cache = require('../utils/cache.js'),
    async = require('async'),
    oxygenService = require('../client/oxygen/user.js'),
    pelicanService = require('../client/pelican/user.js'),
    payportService = require('../client/payport/payment_profiles.js'),
    ucmService = require('../client/ucm/user.js');

/*
 Checks the health of the system or its dependencies.
 When the param 'mode' is passed as 'peers', will check its dependencies (e.g: Pelican, Oxygen, UCM, Payport).
 When the param 'mode' is not passed or is different than 'peers', will make only its self check.
 */
exports.checkHealth = function(req, callback) {
    if (req.param('mode') === 'peers') {
        checkDependencies(req, function(err, response) {
            return callback(null, (response !== 'OK' ? 'fail:' + response : 'OK'));
        });
    } else {
        checkSelf(function(err, response) {
            return callback(null, (err ? 'fail:' + err : 'OK'));
        });
    }
};

function checkDependencies(req, callback) {
    healthCheckDependencies(req, function(err, results) {
        if (err) {
            return callback('Unable to connect to peers.');
        }
        return callback(null, results);
    });
}

function checkSelf(callback) {
    return checkCache(callback);
}

/*
 Checks if the cache is responsive. Returning an error when it's not responsive.
 */
function checkCache(callback) {
    cache.getClient(function(err, client) {
        if (err) {
            return callback('Unable to connect with Redis on A-mart cache.');
        }
        return callback(null, client);
    });
}

/*
 * Returns true if status code if 504 (timeout) or 5XX
 */
function doesStatusCodeFailHealthCheck(err) {
    return err.statusCode && (err.statusCode === 504 || err.statusCode.toString().match(/^5\d+/));
}

function healthCheckDependencies(req, callback) {
    //Make the calls in parallel and create the response if all of them are successful
    async.parallel({
        checkPelican: function(callback) {
            pelicanService.getHealthcheck(req, function(err, pelicanResponse) {
                if (err) {
                    return callback(null, 'Call to Pelican Service failed :' + err);
                }
                var results = pelicanResponse.replace('v2status: ', '').split(', ');
                var failures = [];
                results.forEach(function(v2Info) {
                    var parts = v2Info.split(':');
                    if (parts[1] !== 'OK') {
                        failures.push(v2Info);
                    }
                });
                if (failures.length) {
                    return callback(null, 'Call to Pelican Service failed :' + failures);
                }
                return callback(null, 'OK');
            });
        },
        checkOxygen: function(callback) {
            oxygenService.getHealthcheck(req, function(err, oxygenResponse) {
                if (err && doesStatusCodeFailHealthCheck(err)) {
                    return callback(null, 'Call to Oxygen Service failed :' + err);
                }
                if (oxygenResponse.HealthCheck.status !== 'Good') {
                    return callback(null, 'Call to Oxygen Service failed : O2 is down');
                }
                return callback(null, 'OK');
            });
        },
        checkUCM: function(callback) {
            ucmService.getBillingProfiles('12345', req.headers['X-Transaction-Ref'], function(err, ucmResponse) {
                if ((err) && (err.message.indexOf('400') === -1)) {
                    return callback(null, 'Call to UCM Service failed :' + err);
                }
                return callback(null, 'OK');
            });
        },
        checkPayport: function(callback) {
            payportService.getHealthcheck(req, function(err, payportResponse) {
                if (err && doesStatusCodeFailHealthCheck(err)) {
                    return callback(null, 'Call to Payport Service failed :' + err);
                }
                return callback(null, 'OK');

            });
        }
    }, function(err, results) {
        if (err) {
            return callback(err);
        }
        var errs = [];
        for (var i in results) {
            if (results[i] !== 'OK') {
                errs.push(results[i]);
            }
        }
        return errs.length ? callback(null, errs) : callback(null, 'OK');
    });
}
