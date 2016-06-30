'use strict';
var client = require('./trillium_client.js');

exports.cleanseAddress = function(req, address, callback) {
    return client.post('/S/Cleanser/Request/Address',
        {
            body: createCleanseAddressBody(address),
            gtid: req.headers['X-Transaction-Ref']
        },
        function(err, cleanseAddressResult) {
            if (err) {
                return callback(err);
            }

            return callback(null, cleanseAddressResult);
        }
    );
};

function createCleanseAddressBody(address) {
    return {
        'Request': {
            'REQUESTTYPE': 'Cleanse',
            'Address': {
                'City': address.city,
                'CountryCode': address.country,
                'PostalCode': address.postalCode,
                'State': address.stateProvince,
                'AddressLine1': address.streetAddress,
                'MatchLevel': ''
            }
        }
    };
}
