//'use strict';
// jshint ignore: start
/**
 * `OpenIdAuthenticationError` error.
 *
 * @api public
 */
function OpenIdAuthenticationError(message, id) {
    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);
    this.name = 'OpenIdAuthenticationError';
    this.message = message || null;
    this.id = id;
}

/**
 * Inherit from `Error`.
 */
OpenIdAuthenticationError.prototype.__proto__ = Error.prototype;

/**
 * Expose `OpenIdAuthenticationError`.
 */
module.exports = OpenIdAuthenticationError;
