'use strict';
var ucmService = require('../client/ucm/user.js');
var logger = require('../utils/logger.js');
var utils = require('../utils/util.js');

/*
 Get the billing profiles from UCM.
 */
exports.getUCMBillingProfiles = function(oxygenId, country, gtid, callback) {
    if (!oxygenId) {
        logger.errorMessage(undefined, 'It was not possible to call UCM to get the billing profiles ' +
        'since the \'oxygenId\' is undefined.');

        var response = {
            'country': country,
            'paymentProfiles': []
        };

        return callback(null, response);
    }

    ucmService.getBillingProfiles(oxygenId, gtid, function(err, ucmResponse) {
        var response = {};
        response.country = country;

        if (err) {
            response.paymentProfiles = [];
        } else {
            try {
                var jsonUcmResponse = JSON.parse(ucmResponse);
                var contact = jsonUcmResponse.ListOfContacts.Contact;

                if (utils.isValid(contact)) {
                    response.emailAddress = contact.EmailAddress;

                    if (utils.isValid(contact.ContactPaymentProfile) ||
                        utils.isValid(contact.ContactAddress)) {
                        response.country = getUcmCountry(jsonUcmResponse);
                    }

                    if (utils.isValid(contact.ContactPaymentProfile)) {
                        response.paymentProfiles = getPaymentProfiles(response.country, jsonUcmResponse);
                    } else {
                        response.paymentProfiles = [];
                    }
                }
            } catch (err) {
                logger.debug('Error : ucmbillingprofiles.js - getUCMBillingProfiles() : ' + err.message);
                return callback(err);

            }
        }

        callback(null, response);
    });
};

/*
 Finds and returns the profile with the credit card with the last used date.
 */
function getLastUsedProfile(paymentProfiles) {
    var lastUsedDate = new Date('01/01/1970 00:00:00');
    var lastUsedProfile = null;

    for (var p in paymentProfiles) {
        var profile = paymentProfiles[p];
        var profileDate = new Date(profile.LastUsedDate);

        if (profileDate.getTime() > lastUsedDate.getTime()) {
            lastUsedDate = profileDate;
            lastUsedProfile = profile;
        }
    }

    return lastUsedProfile;
}

/*
 Finds and return the country from UCM response. If UCM response has contact payment profiles, returns the country from the contact
 with the last used profile.
 If UCM response doesn't have contact payment profiles but has contact addresses, returns the country with the primary address ('@IsPrimary'] == 'Y')
 Else, returns a blank string.
 */
function getUcmCountry(jsonUcmResponse) {
    var country = '';
    if (utils.isValid(jsonUcmResponse.ListOfContacts.Contact.ContactPaymentProfile)) {
        var lastUsedProfile = getLastUsedProfile(
            utils.getAsArray(jsonUcmResponse.ListOfContacts.Contact.ContactPaymentProfile.PaymentProfile)
        );

        if (utils.isValid(lastUsedProfile)) {
            country = lastUsedProfile.CountryCode;
        }
    }

    return country;
}

/*
 Transform the UCM response on the structured data that will be returned by a-mart
 */
function getPaymentProfiles(countryCode, jsonUcmResponse) {
    var profiles = utils.getAsArray(jsonUcmResponse.ListOfContacts.Contact.ContactPaymentProfile.PaymentProfile);
    var paymentProfiles = [];
    var regionCountries = utils.getCountriesFromSameRegion(countryCode);
    var p;
    var pLen = profiles.length;

    for (p = 0; p < pLen; p++)  {
        var profile = profiles[p];
        if (utils.contains(regionCountries, profile.CountryCode)) {
            var paymentProfile = {
                paymentProfile : {
                    creditCardInfo : {
                        last4Digits : profile.LastDigits,
                        cardType : profile.CardType,
                        expMonth : profile.ExpirationDate.split('/')[0],
                        expYear : profile.ExpirationDate.split('/')[1]
                    },
                    billingInfo : {
                        firstName : jsonUcmResponse.ListOfContacts.Contact.FirstName,
                        lastName : jsonUcmResponse.ListOfContacts.Contact.LastName,
                        streetAddress : profile.Address1 +
                            (utils.isValid(profile.Address2) ? ' ' + profile.Address2 : '') +
                            (utils.isValid(profile.Address3) ? ' ' + profile.Address3 : ''),
                        city : profile.City,
                        country : profile.CountryCode,
                        stateProvince : profile.State,
                        postalCode : profile.Zip,
                        lastUsedDate : profile.LastUsedDate
                    }
                }
            };

            paymentProfiles.push(paymentProfile);
        }
    }
    return paymentProfiles;
}
