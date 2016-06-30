'use strict';
var openidConfig = require('config').openidConfig;

var adskopenid = exports;

adskopenid.Register = function Register() {
    this.requestParams = {
        'openid.ns.account': 'http://autodesk.com/openid/ext/register/1.0', 'openid.account.mode': 'register'
    };
};

adskopenid.Register.prototype.fillResult = function(params, result) {
};

adskopenid.CustomUI = function CustomUI() {
    this.requestParams = {
        'openid.ns.customui': 'http://autodesk.com/openid/ext/customui/1.0',
        'openid.customui.override_css': 'true',
        'openid.customui.x_ui_type': 'consumer',
        'openid.customui.logo_url': openidConfig.customlogo,
        'openid.customui.logo_alt_text': openidConfig.customlogotxt,
        'openid.customui.x_open_id_custom_ui': openidConfig.customcss
    };
};

adskopenid.CustomUI.prototype.fillResult = function(params, result) {
};

adskopenid.AuthType = function AuthType() {
    this.requestParams = {
        'openid.ns.authtype': 'http://autodesk.com/openid/ext/authtype/1.0',
        'openid.authtype.x_openid_mode': 'adskidonly',
        'openid.authtype.x_auth_view_mode': 'iframe'
    };
};

adskopenid.AuthType.prototype.fillResult = function(params, result) {
};

