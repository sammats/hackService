'use strict';
var priceQuoteClient = require('../client/pelican/price-quote.js');

/**
 * Gets Pelican offering by product line
 * Returns offerings from a provided store, productLine, storeType, country combination
 */
exports.getPriceQuote = function(request, callback) {

    priceQuoteClient.getPriceQuote(
        request.body.userId,
        request.body.lineItems,
        request.body.shipping,
        function(err, result) {

            if (err) {
                return callback(err);
            }
            return callback(null, {totals: JSON.parse(result).data.totals});

        });

};
