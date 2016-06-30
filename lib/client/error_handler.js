'use strict';
/**
 * `Error Handler.
 *
 * @api public
 */
function CustomError(code, message) {
    this.name = 'Error';
    this.message = message || null;
    this.code = code || null;
}

CustomError.prototype = {
    isCode: function(code) {
        return this.code === code;
    }
};

module.exports = CustomError;
