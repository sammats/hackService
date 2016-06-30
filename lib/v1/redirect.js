'use strict';
var moment = require('moment');
var utils = require('../utils/util.js');
var logger = require('../utils/logger.js');
var auth = require('../auth/auth.js');
var partnerConfig = require('config').partner;
var configParam;
/*
 *  The function Validate Signature and Timestamp
 *	@param {Object} req - req Object
 *	@param {Object} callback - callback object
 *  @return {Object} callback
 */
exports.processRedirect = function(req, callback) {
    var response = {};
    var isValidSign, isValidDate, err;
    configParam = utils.getPartnerConfig(req.query.partner);

    if (configParam === null) {
        err = new Error('Invalid Partner');
        logger.debug(err);
        return callback(err);
    }

    isValidSign = isValidSignature(req);
    if (!isValidSign) {
        err = new Error('Invalid Signature');
        logger.debug(err);
        return callback(err);
    }

    isValidDate = isValidDateSent(req, callback);
    if (!isValidDate) {
        err = new Error('Invalid Date');
        logger.debug(err);
        return callback(err);
    }

    response.user = {};
    auth.generateSessionObj(req.query.userId, function(err, params) {
        response.user.signature = req.query.signature;
        response.user.timestamp = req.query.timestamp;
        response.user.userId = req.query.userId;
        response.user.country = req.query.country;
        response.user.subId = req.query.subId;
        response.user.sessionId = params.sessionId;
        response.user.grantToken = params.grantToken;
        response.user.partner = req.query.partner.toLowerCase();
        //Only pass offeringId if subId doesn't exists.
        if (!utils.isValid(req.query.subId)) {
            //only pass fx when both Subid and OfferingId does not exists
            if (!utils.isValid(req.query.offeringId)) {
                response.user.fx = req.query.fx;
            } else { // If Offering Id exist pass only offering Id
                response.user.offeringId = req.query.offeringId;
            }
        }
        callback(null, response);
    });
};
/*
 *  The function Validate Signature . It generate the hmac signature using userId + timestamp and match with req.signature
 *	If the req.signature matches with hmac generated signature returs true otherwise it returns false
 *	@param {Object} req - req Object
 *  @return {boolean} isValidSign - boolean flag either true or false
 */
function isValidSignature(req) {
    var isValidSign = false,
        userId = req.query.userId,
        timeStamp = req.query.timestamp,
        hashCode = userId + timeStamp,
        secretKey = configParam.secretAccessKey,
        signature = utils.getHmacSignature(hashCode, secretKey);

    if (signature === decodeURIComponent(req.query.signature)) {
        isValidSign = true;
    }
    return isValidSign;
}

/*
 *  The function Validate Date Stamp . It matches current date (GMT)  with req.timestamp + 14 days
 *	If the current date(GMT) is before req.timestamp + 14 days, it returns true true otherwise it returns false
 *	@param {Object} req - req Object
 *	@param {Object} callback - callback Object
 *  @return {boolean} isValidDate - boolean flag either true or false
 */
function isValidDateSent(req, callback) {
    var isValidDate, timeStamp, now, gmtFormat, currentDate, tDate, err, addedStampDate;
    isValidDate = false;
    timeStamp = req.query.timestamp;
    now = new Date();
    gmtFormat = partnerConfig.gmtDateFormat;
    //Calling covertDateformat utility to convert Date to GMT format from util.js
    currentDate = utils.convertDateformat(now, gmtFormat);
    tDate = new Date(timeStamp);
    /* jshint ignore:start */
    // this is a valid == comparison since invalid tDate comes as object
    if (tDate == 'Invalid Date') {
        err = new Error('Invalid timestamp Date Format');
        logger.debug(err);
        return callback(err);
    }
    /* jshint ignore:end */
    addedStampDate = utils.getStampDate(tDate, configParam, gmtFormat);
    if (moment(currentDate).isBefore(addedStampDate)) {
        isValidDate = true;
    }
    return isValidDate;
}
