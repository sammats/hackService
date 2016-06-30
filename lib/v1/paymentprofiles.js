'use strict';
var paymentProfilesService = require('../client/payport/payment_profiles.js'),
    ucmBillingProfiles = require('./ucmbillingprofiles.js'),
    utils = require('../utils/util.js'),
    utilsResponse = require('../utils/response.js'),
    lodash = require('lodash-node'),
    logger = require('../utils/logger.js');

/* ADD Payment Profile data for a user to PSP Handler.
 *  @param {Object} req - Request Object
 *	@param {Object} callback
 *  @return {Object} callback
 */
exports.addPaymentProfile = function(req, callback) {
    if (!utils.isValid(req.param('userExtKey'))) {
        return callback(new Error('Invalid Request. \'userExtKey\' is required.'));
    }

    try {
        addPhone(req);
        addIpAddress(req);
    } catch (err) {
        return callback(err);
    }

    paymentProfilesService.addPaymentProfile(req, function(err, result) {
        if (err) {
            return callback(err);
        }
        var paymentProfile = parsePaymentProfilesResponse(result);
        return callback(null, paymentProfile);
    });
};
/*  UPDATE Payment Profile data for a user to PSP Handler.
 *  @param {Object} req - Request Object
 *	@param {Object} callback
 *  @return {Object} callback
 */
exports.updatePaymentProfile = function(req, callback) {
    if (!utils.isValid(req.param('userExtKey'))) {
        return callback(new Error('Invalid Request. \'userExtKey\' is required.'));
    }

    try {
        addIpAddress(req);
    } catch (err) {
        return callback(err);
    }

    paymentProfilesService.updatePaymentProfile(req, function(err, result) {
        if (err) {
            return callback(err);
        }
        var paymentProfile = parsePaymentProfilesResponse(result);
        return callback(null, paymentProfile);
    });
};

/*  GET Payment Profile data for a user. For more information, read the documentation at routes\paymentprofiles.js
 *  @param {Object} req - The request
 *	@param {Object} callback The callback function
 *  @return {Object} callback
 */
exports.getPaymentProfiles = function(req, callback) {

    var err;
    var reqPaymentProfiles = null;
    var country; // this is being used to hold the country returned from the ucmResponse object

    // Request Object
    var requestObj = {
        userExternalKey: req.param('userExtKey'),
        country: req.param('country'),
        ucmpaymentprofiles: req.param('ucmpaymentprofiles'),
        syncUCM: req.param('syncUCM'),
        useNewFormat: req.param('useNewFormat')
    };

    // Error handling goes here.
    err = handleErrors(requestObj);
    if (err) {
        logger.debug(err);
        return callback(err);
    }

    // DeSerializing
    if (utils.isValid(requestObj.ucmpaymentprofiles)) {
        reqPaymentProfiles = JSON.parse(decodeURIComponent(requestObj.ucmpaymentprofiles));
    }

    // syncUCM == true, Payport will take care of UCM call.
    // Otherwise, go through the existing logic
    if (requestObj.syncUCM === '1') {
        var optionsSyncUCM = {
            syncUCM: 1,
            country: requestObj.country,
            userExternalKey: requestObj.userExternalKey,
            gtid: req.headers['X-Transaction-Ref'],
            useNewFormat: requestObj.useNewFormat,
            queryParams: req.query
            // country: requestObj.country
        };

        getPayportPaymentProfiles(optionsSyncUCM, function(err, payportResponse) {
            //Add function to sort the Array of payportResponse in descending order of lastUsedDate
            var sortedPaymentResponse = payportResponse.sort(paymentProfileSort);
            return callback(null, sortedPaymentResponse);
        });

    } else {
        var options = {
            country: requestObj.country,
            reqPaymentProfiles: reqPaymentProfiles,
            userExternalKey: requestObj.userExternalKey,
            syncUCM: 0,
            gtid: req.headers['X-Transaction-Ref'],
            queryParams: req.query
        };

        // existing logic
        getUCMPaymentProfiles(options, function(err, ucmResponse) {
            if (err) {
                return callback(err);
            }

            if (utils.isValid(ucmResponse) &&
                utils.isValid(ucmResponse.country)) {
                options.country = ucmResponse.country;
            }

            getPayportPaymentProfiles(options, function(err, payportResponse) {
                var payportPaymentProfiles = utils.getAsArray(payportResponse);
                var ucmPaymentProfiles = ucmResponse.paymentProfiles;
                var mergedPaymentProfiles = mergePaymentProfiles(payportPaymentProfiles, ucmPaymentProfiles);
                //Add function to sort the Array of mergedPaymentProfiles in descending order of lastUsedDate
                var sortedMergedResponse = mergedPaymentProfiles.sort(paymentProfileSort);
                return callback(null, sortedMergedResponse);
            });
        });
    }
};

/*
 Get the payment profiles from payport for the user with the userExternalKey received as parameter and that have the same country as the one
 received as parameter.
 If there is an error on calling Payport, throws an Error.
 */
function getPayportPaymentProfiles(options, callback) {

    var queryParams = '';
    var regionCountries = '';

    if (options.syncUCM) {
        queryParams = queryParams + 'syncUCM=' + options.syncUCM;
    }

    if (options.useNewFormat) {
        queryParams += '&useNewFormat=1';
    }

    if (options.queryParams && options.queryParams.storeType) {
        queryParams += '&storeType=' + options.queryParams.storeType;
    }

    if (options.country) {
        regionCountries = utils.getCountriesFromSameRegion(options.country);
    }

    paymentProfilesService.getPaymentProfiles(options.userExternalKey, queryParams, {gtid: options.gtid},
        function(err, payportResponse) {
            if (err) {
                return callback(err);
            }

            var resPaymentProfiles = [];
            var paymentProfiles = utils.getAsArray(JSON.parse(payportResponse).paymentProfiles);
            var paramOpts = (options.queryParams) ? options.queryParams : {};

            var i,
            iLen = paymentProfiles.length;

            for (i = 0; i < iLen; i++) {
                var paymentProfile = paymentProfiles[i];
                var paymentProfileCountry = paymentProfile.billingInfo.country;

                //Only add billing profiles for the countries inside the filter
                if (utils.isValid(paymentProfileCountry) &&
                    (regionCountries === '' || utils.contains(regionCountries, paymentProfileCountry))) {
                    //jscs:disable maximumLineLength
                    resPaymentProfiles.push(utilsResponse.setPayportPaymentProfilesResponse(paymentProfile, paramOpts));
                    //jscs:enable maximumLineLength
                }
            }

            return callback(null, resPaymentProfiles);
        }
    );
}

/*
 If reqPaymentProfiles is null or undefined, gets the payment profiles from UCM.
 If reqPaymentProfiles is valid, returns an object with the reqPaymentProfiles and the country received.
 */
function getUCMPaymentProfiles(options, callback) {
    if (lodash.isNull(options.reqPaymentProfiles) ||
        lodash.isUndefined(options.reqPaymentProfiles)) {

        ucmBillingProfiles.getUCMBillingProfiles(options.userExternalKey, options.country, function(err, ucmResponse) {
            if (err) {
                return callback(err);
            }
            return callback(null, ucmResponse);
        });
    } else {
        var response = {
            paymentProfiles: options.reqPaymentProfiles,
            country: options.country
        };
        return callback(null, response);
    }
}

/*
 Merge the payment profiles from payport and UCM.
 When there is a paymentProfile from payport, update the address with UCM info.
 When there is no paymentProfile on Payport, return the address of the last used card on UCM
 */
function mergePaymentProfiles(payportPaymentProfiles, ucmPaymentProfiles) {
    if (payportPaymentProfiles.length > 0) {
        for (var i in payportPaymentProfiles) {
            var payportPaymentProfile = payportPaymentProfiles[i];

            var umcPaymentProfile = getSamePaymentProfileFromUCM(payportPaymentProfile, ucmPaymentProfiles);

            if (utils.isValid(umcPaymentProfile)) {
                updatePaymentProfileAddress(payportPaymentProfile, umcPaymentProfile.paymentProfile.billingInfo);
            } else {
                payportPaymentProfile.paymentProfile.billingInfo.lastUsed = null;
            }
        }

        return payportPaymentProfiles;
    } else if (ucmPaymentProfiles.length > 0) { //When there is no paymentProfile on Payport, return the address of the last used card on UCM
        var ucmPaymentProfile = getLastUsedProfile(ucmPaymentProfiles);

        ucmPaymentProfile.paymentProfile.creditCardInfo = {};

        return utils.getAsArray(ucmPaymentProfile);
    } else { //When there is no profile on payport and UCM, return an empty list
        return [];
    }
}

/*
 Try to find a payment profile on UCM that matches with the payment profile on Payport.
 The match is made by the card's last 4 digits and its type.7
 */
function getSamePaymentProfileFromUCM(payportPaymentProfile, ucmPaymentProfiles) {
    var ucmProfile = lodash.find(ucmPaymentProfiles, function(ucmProfile) {
        if (!utils.isValid(ucmProfile) ||
            !utils.isValid(ucmProfile.paymentProfile) ||
            !utils.isValid(ucmProfile.paymentProfile.creditCardInfo)) {
            return false;
        }

        var ucmCreditCardInfo = ucmProfile.paymentProfile.creditCardInfo;
        var payportCreditCardInfo = payportPaymentProfile.paymentProfile.creditCardInfo;

        if (utils.isValid(ucmCreditCardInfo.cardType) &&
            utils.isValid(payportCreditCardInfo.cardType) &&
            (ucmCreditCardInfo.last4Digits === payportCreditCardInfo.last4Digits) &&
            (ucmCreditCardInfo.cardType.toUpperCase() === payportCreditCardInfo.cardType.toUpperCase())) {
            return true;
        } else {
            return false;
        }
    });

    return ucmProfile;
}

/*
 Updates the billing info on the Payport payment profile with the billing info received.
 Does not update firstName and lastName.
 */
function updatePaymentProfileAddress(payportPaymentProfile, billingInfo) {
    var payportBillingInfo = payportPaymentProfile.paymentProfile.billingInfo;

    payportBillingInfo.streetAddress = billingInfo.streetAddress;
    payportBillingInfo.city = billingInfo.city;
    payportBillingInfo.country = billingInfo.country;
    payportBillingInfo.stateProvince = billingInfo.stateProvince;
    payportBillingInfo.postalCode = billingInfo.postalCode;
    payportBillingInfo.lastUsed = billingInfo.lastUsedDate;
}

/*
 Finds and returns the profile with the credit card with the last used date.
 */
function getLastUsedProfile(paymentProfiles) {
    var lastUsedDate = new Date('01/01/1970 00:00:00');
    var lastUsedProfile = null;

    for (var p in paymentProfiles) {
        var profile = paymentProfiles[p];
        var profileDate = new Date(profile.paymentProfile.billingInfo.lastUsedDate);

        if (profileDate.getTime() > lastUsedDate.getTime()) {
            lastUsedDate = profileDate;
            lastUsedProfile = profile;
        }
    }

    return lastUsedProfile;
}

function addIpAddress(req) {
    if (!utils.isValid(req) ||
        !utils.isValid(req.body) ||
        !utils.isValid(req.connection) ||
        !utils.isValid(req.body.user)) {
        throw new Error('Invalid request. The request must be valid, have a body and its body must have a user. ' +
        'It also must be an http request and contain a \'connection\'');
    }
    var user = req.body.user;

    user.ip = utils.getIpAddress(req);
}

function addPhone(req) {
    if (!utils.isValid(req) ||
        !utils.isValid(req.body) ||
        !utils.isValid(req.body.user)) {
        throw new Error('Invalid request. The request must be valid, have a body and its body must have a user.');
    }
    var user = req.body.user;

    user.phone = '11234567890';
}

function parsePaymentProfilesResponse(response) {
    if (response) {
        var parsedResponse = JSON.parse(response);
        if (parsedResponse.paymentProfile) {
            var res = {
                paymentProfiles: []
            };

            res.paymentProfiles.push(filterResponse(parsedResponse.paymentProfile));

            return res;
        }
    }

    return JSON.parse(response);
}

function filterResponse(paymentProfile) {
    delete paymentProfile.userId;
    delete paymentProfile.id;

    return paymentProfile;
}

function handleErrors(obj) {

    // In any case we need the user external key
    if (!utils.isValid(obj.userExternalKey)) {
        return new Error('Invalid Request. uid is required.');
    } else if ((utils.isValid(obj.country) && !utils.isValid(obj.ucmpaymentprofiles)) ||
        (!utils.isValid(obj.country) && utils.isValid(obj.ucmpaymentprofiles))) {
        // both country and ucmpaymentprofiles should be present if either of them is passed in the request.
        return new Error('Invalid Request. When passing country or ucmpaymentprofiles, ' +
        'the other parameter is also required.');
    }

    return null;
}
/*
 * DEF427 - Sorting Payment Profile (Credit Card Information) in descending order
 *
 * */

function paymentProfileSort(a, b) {
    return new Date(b.paymentProfile.billingInfo.lastUsed).getTime() -
        new Date(a.paymentProfile.billingInfo.lastUsed).getTime(); //descending order
}
