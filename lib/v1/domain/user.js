'use strict';
exports.user = function(fullUser) {
    return {
        id: fullUser.id,
        externalKey: fullUser.externalKey,
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        billing_profiles: [],
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
        email: ''
    };
};
