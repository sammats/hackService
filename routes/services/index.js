'use strict';
//express setup
var express = require('express'),
    router = express.Router(),
    v1 = require('./v1/index');

/*
 * v1 Services path
 */
router.use('/v1', v1);

module.exports = router;

