'use strict';
var auth = require('./auth');
var adskpassport = require('./AdskPassport');

exports.configure = function(app) {

    app.get(auth.urls.authUrl, adskpassport.login);

    app.get(auth.urls.redirectUrl, adskpassport.successHandler);

    app.get(auth.urls.registerUrl, adskpassport.register);

    app.post(auth.urls.redirectUrl, adskpassport.successHandler);

    app.get(auth.urls.logoutUrl, adskpassport.logout);

    // error middleware which will handle all the openid errors and pass on the error to the client.
    // Client should navigate to the generic error page.
    app.use(adskpassport.handleOpenIdErrors);

};
