'use strict';
var addressCleanserService = require('../client/trillium/address_cleanser.js'),
    logger = require('../utils/logger.js'),
    matchCode = {
        'ADRVR-000': 'EXACT_MATCH',
        'ADRVR-001': 'SUGGESTED_ADDRESS',
        'ADRVR-002': 'CITY_OR_ZIP_CODE_FAILURE',
        'ADRVR-003': 'STREET_NAME_FAILURE',
        'ADRVR-004': 'HOUSE_NUMBER_RANGE_FAILURE',
        'ADRVR-005': 'GENERAL_ERROR',
        'ADRVR-006': 'INTERNAL_ERROR',
        'ADRVR-007': 'INVALID_REQUEST'
    };

exports.cleanseAddress = function(req, callback) {
    var requestAddress = createAddressData(req);

    if (!isRequestValid(requestAddress)) {
        return callback(null, createInvalidAddressResponse('ADRVR-007'));
    }

    addressCleanserService.cleanseAddress(req, requestAddress, function(err, cleanseAddressResult) {
        if (err) {
            return callback(null, createInvalidAddressResponse('ADRVR-006'));
        }

        return callback(null, createAddressResponse(cleanseAddressResult, requestAddress));
    });
};

function createAddressData(req) {
    if (!req || !req.body || !req.body.address) {
        return null;
    }
    var address = req.body.address;
    return {
        'city': address.city,
        'country': address.country,
        'postalCode': address.postalCode,
        'stateProvince': address.stateProvince,
        'streetAddress': address.streetAddress
    };
}

function isRequestValid(address) {
    return (address &&
    address.city &&
    address.country &&
    address.postalCode &&
    address.stateProvince &&
    address.streetAddress);
}

function createInvalidAddressResponse(code) {
    return createValidationResponse(code, null);
}

function createValidationResponse(code, address) {
    var type, status;

    switch (code) {
        case 'ADRVR-000' : //Exact Match
            type = 'SUCCESS';
            status = 'EXACT_MATCH';
            break;
        case 'ADRVR-001' : //Suggestion Found
            type = 'SUCCESS';
            status = 'SUGGESTION_FOUND';
            break;
        default : //Errors
            type = 'ERROR';
            status = 'ERROR';
    }

    return {
        'validationStatus': {
            'type': type,
            'status': status,
            'code': code,
            'message': matchCode[code],
            'address': address
        }
    };
}

function createAddressResponse(cleanseAddressResult, originalAddress) {
    if (!cleanseAddressResult || !cleanseAddressResult.Request || !cleanseAddressResult.Request.Address) {
        logger.debug('Cannot find a valid response from Trillium. cleanseAddressResult: ' +
                        JSON.stringify(cleanseAddressResult));

        return createInvalidAddressResponse('ADRVR-006');
    }

    var cleansedAddress = cleanseAddressResult.Request.Address;
    var code = getCodeFromCleanseAddressResult(cleansedAddress, originalAddress);

    if (code === 'ADRVR-000' ||
        code === 'ADRVR-001') {
        return createValidationResponse(code, {
            'city': cleansedAddress.City,
            'country': cleansedAddress.CountryCode,
            'postalCode': cleansedAddress.PostalCode,
            'stateProvince': cleansedAddress.State,
            'streetAddress': cleansedAddress.AddressLine1
        });
    } else {
        return createInvalidAddressResponse(code);
    }
}

function getCodeFromCleanseAddressResult(cleansedAddress, originalAddress) {
    switch (cleansedAddress.MatchLevel) {
        case '0' : //Exact Match
            return (areAddressesEqual(cleansedAddress, originalAddress) ? 'ADRVR-000' : 'ADRVR-001');
        case '1' : //City/Province or ZIP code failure
            return 'ADRVR-002';
        case '2' : //Street name failure
            return 'ADRVR-003';
        case '3' : //House number range failure
            return 'ADRVR-004';
        default:
            /*  Street component failure
             Multiple possible matches to Directory
             Match exists, but too many corrections were required to make the match
             Match to Street DPID
             Match to Locality DPID
             */
            return 'ADRVR-005';
    }
}

function areAddressesEqual(trilliumAddress, address) {
    return (trilliumAddress.City === address.city &&
        trilliumAddress.CountryCode === address.country) &&
        trilliumAddress.PostalCode === address.postalCode &&
        trilliumAddress.State === address.stateProvince &&
        trilliumAddress.AddressLine1 === address.streetAddress;
}
