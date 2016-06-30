'use strict';
var express = require('express');
var router = express.Router();

var services = require('./services/index');
var redirect = require('./redirect');
var estoreRedirect = require('./estore-redirect');

/*
 * Setup /services route
 * Most end points live here
 */
router.use('/services', services);

/*
 * Redirect
 * ? For IPP
 */
router.use('/r', redirect);

/*
 * Estore Redirect
 */
router.use('/er', estoreRedirect);

module.exports = router;
