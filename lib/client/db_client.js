'use strict';
//handle db io,
//TODO: refactor methods
//All db client methods provide both a promise and callback interface

var redisClient = require('../utils/cache.js'),
    Q = require('q'),
    logger = require('../utils/logger.js'),
    _ = require('lodash-node'),
    cartConfig = require('config').cart,
    storeConfig = require('config').store,
    CustomErrorHandler = require('../client/error_handler.js'),
    cartStorageExpiration = cartConfig.cartStorageExpiration ? cartConfig.cartStorageExpiration : 1000,
    redisStoreKeyPrefix = 'cachedStore-';

/**
 * Get cart by id, returns a promise (or you can also use the callback)
 * */
exports.getCartById = function(id, callback) {

    var deferred = Q.defer();
    redisClient.getClient(function(err, client) {
        if (err) {

            logger.debug('Unable to get redis client');

            deferred.reject(new Error(err));
        } else {

            client.get(id, function(err, reply) {
                if (err || !reply) {

                    logger.debug('Unable to retrieve cart.');

                    deferred.reject(new Error(err));
                }

                logger.debug('Cart retrieved.');

                deferred.resolve(JSON.parse(reply));
            });
        }
    });

    deferred.promise.nodeify(callback);

    return deferred.promise;
};

/*
 * Create new cart from id, and cart json
 * */

exports.createCart = function(id, cart, callback) {

    var deferred = Q.defer();
    redisClient.getClient(function(err, client) {

        if (err) {
            logger.debug('Unable to get redis client');
            deferred.reject(new Error(err));
        } else {

            client.set(id, JSON.stringify(cart), function(error, result) {

                if (result) {
                    logger.debug('Cart created.');

                    client.expire(id, cartStorageExpiration);
                    deferred.resolve(cart);

                } else {
                    logger.debug('Unable to create cart: ' + error);

                    deferred.reject(new Error('Unable to update cart:' + error));
                }

            });
        }
    });

    deferred.promise.nodeify(callback);

    return deferred.promise;

};

/*
 * Updates an existing cart or creates one if it doesn't exist
 * */

exports.updateCart = function(id, cart, merge, callback) {

    var deferred = Q.defer();
    redisClient.getClient(function(err, client) {

        if (err) {

            logger.debug('Unable to get redis client');

            deferred.reject(new Error(err));
        } else {

            client.get(id, function(err, sourceCart) {

                if (sourceCart && merge) {
                    //update cart
                    var sourceCartObj = JSON.parse(sourceCart);

                    cart.items.forEach(function(cartItem) {
                        var existingItem = _.find(sourceCartObj.items, {productId: cartItem.productId});

                        // if the parent was already added copy over the child id
                        if (existingItem && cartItem.childProductId) {
                            existingItem.childProductId = cartItem.childProductId;
                        }

                        // if the child was already added copy over the parent id
                        if (existingItem && existingItem.parentProductId) {
                            cartItem.parentProductId = existingItem.parentProductId;
                        }

                        if (existingItem) {
                            if (cartItem.parentProductId) {
                                var parentItemOfExisting = _.find(sourceCartObj.items,
                                    {childProductId: cartItem.productId});
                                // if child added standalone set quantity to parent quantity
                                if (parentItemOfExisting) {
                                    existingItem.quantity = parentItemOfExisting.quantity;
                                }

                            } else {
                                existingItem.quantity++;
                                if (existingItem.childProductId) {

                                    var childItemOfExisting = _.find(sourceCartObj.items,
                                        {productId: existingItem.childProductId});

                                    // if child added standalone set quantity to parent
                                    if (childItemOfExisting) {
                                        childItemOfExisting.quantity = existingItem.quantity;
                                    }
                                }
                            }
                        } else {
                            // if it is a child
                            if (cartItem.parentProductId) {
                                var parentItemOfNew = _.find(sourceCartObj.items, {childProductId: cartItem.productId});

                                // if child added standalone set quantity to parent quantity
                                cartItem.quantity = parentItemOfNew ? parentItemOfNew.quantity : cartItem.quantity;
                            }
                            // if it is a parent
                            if (cartItem.childProductId) {
                                var existingChild = _.find(sourceCartObj.items, {productId: cartItem.childProductId});
                                //and the child already exists, ...
                                if (existingChild) {
                                    // make parent standalone
                                    delete cartItem.childProductId;
                                }
                            }

                            sourceCartObj.items.push(cartItem);
                        }
                    });

                    sourceCartObj.promotions = _.union(sourceCartObj.promotions, cart.promotions);

                    client.set(id, JSON.stringify(sourceCartObj), function(error, result) {
                        if (result) {

                            logger.debug('Update cart success');

                            deferred.resolve(sourceCartObj);

                        } else {

                            logger.debug('Update cart failed: ' + error);

                            deferred.reject(new Error('Unable to update cart: ' + error));
                        }
                    });

                } else {
                    //create cart
                    client.set(id, JSON.stringify(cart), function(error, result) {
                        if (result) {

                            logger.debug('Cart did not exist, new cart created.');
                            client.expire(id, cartStorageExpiration);
                            deferred.resolve(cart);

                        } else {

                            logger.debug('Create cart failed: ' + error);

                            deferred.reject(new Error('Unable to create cart: ' + error));
                        }
                    });
                }
            });

        }
    });

    deferred.promise.nodeify(callback);

    return deferred.promise;
};

/*
 * Update an existing cart's key to a new value
 * */

exports.renameCartKey = function(oldKey, newKey, callback) {

    var deferred = Q.defer();
    redisClient.getClient(function(err, client) {

        if (err) {

            logger.debug('Unable to get redis client');

            deferred.reject(new Error(err));
        } else {

            client.rename(oldKey, newKey, function(error, result) {

                if (result) {

                    logger.debug('Cart renamed success.');

                    deferred.resolve(result);

                } else {

                    logger.debug('Unable to rename cart: ' + error);

                    deferred.reject(new Error('Unable to update record: ' + error));
                }
            });
        }
    });

    deferred.promise.nodeify(callback);

    return deferred.promise;
};

/*
 * The function deleteCart deletes a cart from the database by id
 * */
exports.deleteCart = function(id, callback) {
    var deferred = Q.defer();
    redisClient.getClient(function(err, client) {
        if (err) {
            logger.debug('Unable to get redis client as Redis is not able to connect');
            deferred.reject(new Error(err));
            return;
        }
        client.del(id);
        deferred.resolve('OK');
    });

    deferred.promise.nodeify(callback);
    return deferred.promise;
};

/**
 * The function getStoreByExtStoreKey searches the Store Object with extStoreKey
 * @param {string} extStoreKey
 * @param {callback} callback *
 * @return {promise} This returns either the Store Object or error with 404 if store does not exist
 */
exports.getStoreByExtStoreKey = function(extStoreKey, callback) {
    var deferred = Q.defer();
    redisClient.getClient(function(err, client) {
        if (err) {
            logger.debug('Unable to get redis client as Redis is not able to connect');
            deferred.reject(new CustomErrorHandler(504, 'Redis is not able to connect'));
        } else {
            var redisKey = redisStoreKeyPrefix + extStoreKey;
            client.get(redisKey, function(err, reply) {
                if (err) {
                    logger.debug('Unable to retrieve store as Redis is not able to connect');
                    deferred.reject(new CustomErrorHandler(504, 'Redis is not able to connect'));
                } else if (!reply) {
                    logger.debug('Store does not exist in Redis');
                    deferred.reject(new CustomErrorHandler(404, 'DOES NOT EXIST'));
                } else {
                    logger.debug('Store retrieved from Redis');
                    deferred.resolve(JSON.parse(reply));
                }
            });
        }
    });
    deferred.promise.nodeify(callback);
    return deferred.promise;
};

/**
 * The function createStore create new store from extStoreKey, and store json
 * @param {string} extStoreKey
 * @param {string} store
 * @param {callback} callback
 * @return {promise} This returns either the Store Object or error
 */

exports.createStore = function(extStoreKey, store, callback) {
    var deferred = Q.defer();
    redisClient.getClient(function(err, client) {
        if (err) {
            logger.debug('Unable to retrieve store as Redis is not able to connect');
            deferred.reject(new CustomErrorHandler(504, 'Redis is not able to connect'));
        } else {
            var redisKey = redisStoreKeyPrefix + extStoreKey;
            client.psetex(redisKey, storeConfig.cacheStoreTtl, JSON.stringify(store), function(error, result) {
                if (result) {
                    logger.debug('Store created.');
                    deferred.resolve(store);
                } else {
                    logger.debug('Unable to create store as Redis is not able to connect');
                    deferred.reject(new CustomErrorHandler(504, 'Redis is not able to connect'));
                }
            });
        }
    });
    deferred.promise.nodeify(callback);
    return deferred.promise;
};

