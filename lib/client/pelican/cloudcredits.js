'use strict';
var client = require('./pelican_client.js');
var utils = require('../../utils/util.js');
var _ld = require('lodash-node');

// jscs:disable requireSemicolons, validateIndentation, disallowMixedSpacesAndTabs
exports.getCredits = function(params, callback) {
	if (params.filter) {
    	return client.get('/offerings', params, callback) // jshint ignore:line
    }

    return client.get('/forexOffers', params, callback) // jshint ignore:line
};
// jscs:disable requireSemicolons, validateIndentation, disallowMixedSpacesAndTabs
exports.addCloudCreditParams = function(req, params) {
    var userCountry = (params.country) ? params.country : req.query.country;

    var filter = {
        country: userCountry,
        storeType: req.query.storeType,
        productLine: (req.query.fx) ? req.query.fx : req.query.productLine
    };
    params['filter'] = filter;

    //delete params.country;

    return params;
};

exports.setCreditsResponse = function(res) {
    if (!utils.isValid(res) || !utils.isValid(res.data)) {
        throw new Error('Invalid response from Pelican: CLDCR');
    }

    var credit = res.data[0];
    var cloudCreditObj = {
        name: credit.name,
        units: credit.amount,
        description: credit.description,
        externalKey: credit.externalKey,
        price: {
            currencyCode: null,
            amount: null,
            taxCode: null,
            taxType: credit.offeringType,
            priceId: null
        }
    };

    // add descriptors
    cloudCreditObj.descriptors = credit.descriptors;

    // get linkages
    if (res.included && credit.links) {
        var linkageList = _ld.chain(credit.links).pluck('linkage').flatten(true).value(),
            included = res.included;

        var l,
        lLen = linkageList.length;

        for (l = 0; l < lLen; l++) {
            var link = _ld.find(included, linkageList[l]);

            if (link.type === 'price') {
                cloudCreditObj.price.priceId = link.id;
            }

            link = _ld.omit(link, _ld.keys(linkageList[l]));
            _ld.extend(cloudCreditObj.price, link);
        }
    }

    if (cloudCreditObj.price.currency) {
        cloudCreditObj.price.currencyCode = cloudCreditObj.price.currency;
    }

    return cloudCreditObj;
};
