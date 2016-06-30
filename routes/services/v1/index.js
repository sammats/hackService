'use strict';
var express = require('express'),
    router = express.Router(),
    initializer = require('./initializer'),
    cloudcredits = require('./cloudcredits'),
    tax = require('./tax'),
    health = require('./health'),
    refreshtoken = require('./refreshtoken'),
    user = require('./user'),
    subscription = require('./subscription'),
    product = require('./product.js'),
    paymentprofiles = require('./paymentprofiles'),
    purchase = require('./purchase'),
    cart = require('./cart'),
    store = require('./store'),
    offerings = require('./offerings'),
    priceQuote = require('./price-quote'),
    cleanser = require('./cleanser');


router.use('/user', user);
router.use('/subscription', subscription);
router.use('/initializer', initializer);
router.use('/cloudcredits', cloudcredits);
router.use('/product', product);
router.use('/cart', cart);

router.use('/tax', tax);
router.use('/paymentprofiles', paymentprofiles);
router.use('/purchase', purchase);
router.use('/health', health);
router.use('/token', refreshtoken);
router.use('/store', store);
router.use('/offerings', offerings);
router.use('/priceQuote', priceQuote);
router.use('/cleanser', cleanser);

module.exports = router;

