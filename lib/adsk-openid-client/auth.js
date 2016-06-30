'use strict';

var auth = exports;
var openidConfig = require('config').openidConfig;

//auth.config = require('./config/config');

auth.services = {

    /* Adsk openid auth services */
    strategy: require('./strategies/AdskStrategy'),
    passport: require('passport')
};

auth.login = {

    returnURL: openidConfig.siteServiceLayerUrl + '/auth/openid/return',
    realm: openidConfig.siteServiceLayerUrl,
    customui: true,
    ui: {mode: 'iframe'},
    profile: true,
    providerURL: openidConfig.providerUrl,
    stateless: true
};

auth.register = {

    returnURL: openidConfig.siteServiceLayerUrl + '/auth/openid/return',
    realm: openidConfig.siteServiceLayerUrl,
    ui: {mode: 'iframe'},
    customui: true,
    profile: true,
    providerURL: openidConfig.providerUrl,
    register: true,
    stateless: true
};

auth.verifylogin = function(params) {

    var options = {
        profile: true,
        providerURL: openidConfig.providerUrl,
        immediate: true,
        returnURL: openidConfig.siteServiceLayerUrl + '/er?' + params,
        realm: openidConfig.siteServiceLayerUrl
    };

    return options;

};

auth.successHandler = {

    returnURL: openidConfig.siteServiceLayerUrl + '/auth/openid/return',
    realm: openidConfig.siteServiceLayerUrl,
    customui: true,
    ui: {mode: 'iframe'},
    profile: true,
    providerURL: openidConfig.providerUrl,
    stateless: true
};

auth.urls = {
    authUrl: '/auth/openid/login',
    redirectUrl: '/auth/openid/return',
    registerUrl: '/auth/openid/register',
    logoutUrl: '/auth/logout'
};
