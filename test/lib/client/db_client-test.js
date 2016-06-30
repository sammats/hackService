'use strict';
var redis = require('redis'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    cache = require('../../../lib/utils/cache.js'),
    dbClient = require('../../../lib/client/db_client.js'),
    redisClient = require('../../../lib/utils/cache.js');

describe('Cart Redis DB client', function() {
    var client = {
            on: function(str, callback) {
                return callback;
            },
            psetex: function(key, milliseconds, value, callback) {
            },
            end: function() {
            },
            del: function() {
            },
            get: function(sessionId, callback) {
                return callback(null, 'Success');
            },
            set: function(id, cart, callback) {
                return callback(null, 'Success');
            },
            expire: function() {
                return true;
            },
            rename: function(oldKey, newKey, callback) {
                return callback(null, 'Success');
            }
        },
        mockCart = {
            '_id': 'mockCart',
            'promotions': ['promo1', 'promo2'],
            'items': [
                {
                    'productId': '1243534',
                    'quantity': 1
                }
            ]
        },
        sandbox;

    beforeEach(function() {

        sandbox = sinon.sandbox.create();
        sandbox.stub(cache, 'getClient', function(callback) {
            return callback(null, client);
        });
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('get', function() {

        it('should get cart by ID', function() {
            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, '{ "cart": "test" }');
            });

            dbClient.getCartById(123, function(err, result) {
                expect(result.cart).to.be.equal('test');
            });
        });

        it('should return an error if get fails', function() {
            sandbox.stub(client, 'get', function(id, callback) {
                return callback('get error', null);
            });

            dbClient.getCartById(123, function(err, result) {
                expect(err.message).to.equal('get error');
            });
        });

        it('should return an error if getClient fails', function() {
            redisClient.getClient.restore();
            sandbox.stub(redisClient, 'getClient', function(callback) {
                return callback('getClient error', null);
            });

            dbClient.getCartById(123, function(err, result) {
                expect(err.message).to.equal('getClient error');
            });
        });
    });

    describe('create', function() {

        it('should create a cart', function() {
            sandbox.stub(client, 'set', function(id, cart, callback) {
                return callback(null, cart);
            });

            dbClient.createCart(123, 'cart', function(err, result) {
                expect(result).to.equal('cart');
            });
        });

        it('should return an error if creating a cart fails', function() {
            sandbox.stub(client, 'set', function(id, cart, callback) {
                return callback('creating a cart error', null);
            });

            dbClient.createCart(123, 'cart', function(err, result) {
                expect(err.message).to.equal('Unable to update cart:creating a cart error');
            });
        });

        it('should return an error if getting redis client fails', function() {
            redisClient.getClient.restore();
            sandbox.stub(redisClient, 'getClient', function(callback) {
                return callback('getClient error', null);
            });

            dbClient.createCart(123, 'cart', function(err, result) {
                expect(err.message).to.equal('getClient error');
            });
        });
    });

    describe('update', function() {

        it('should create a cart if it doesn\'t already exist', function() {
            sandbox.stub(client, 'set', function(id, mockCart, callback) {
                return callback(null, mockCart);
            });

            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, null);
            });

            dbClient.updateCart(123, mockCart, false, function(err, result) {
                expect(result).to.equal(mockCart);
            });
        });

        it('should increment item quantity if item added already in the cart', function() {

            var mockCartRedis = {
                '_id': 'mockCart',
                'items': [
                    {
                        'productId': '1243534',
                        'quantity': 12
                    }
                ]
            };

            sandbox.stub(client, 'set', function(id, mockCart, callback) {
                    return callback(null, 'fake ok');
                });

            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, JSON.stringify(mockCartRedis));
            });

            dbClient.updateCart(123, mockCart, true, function(err, result) {
                expect(result.items[0].productId).to.equal('1243534');
                expect(result.items[0].quantity).to.equal(13);
            });
        });

        it('should add item if item not added already in the cart', function() {

            var mockCartRedis = {
                '_id': 'mockCart',
                'items': [
                    {
                        'productId': '456',
                        'quantity': 45
                    }
                ]
            };

            sandbox.stub(client, 'set', function(id, mockCart, callback) {
                return callback(null, 'fake ok');
            });

            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, JSON.stringify(mockCartRedis));
            });

            dbClient.updateCart(123, mockCart, true, function(err, result) {
                expect(result.items[0].productId).to.equal('456');
                expect(result.items[0].quantity).to.equal(45);
            });
        });

        it('should sync child quantity with parent quantity of an existing parent item', function() {

            mockCart = {
                '_id': 'mockCart',
                'items': [
                    {
                        'productId': '1234',
                        'quantity': 1
                    }
                ]
            };

            var mockCartRedis = {
                '_id': 'mockCart',
                'items': [
                    {
                        'productId': '1234',
                        'quantity': 2,
                        'childProductId': '4567'
                    },
                    {
                        'productId': '4567',
                        'quantity': 45,
                        'parentProductId': '1234'
                    }
                ]
            };

            sandbox.stub(client, 'set', function(id, mockCart, callback) {
                return callback(null, 'fake ok');
            });

            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, JSON.stringify(mockCartRedis));
            });

            dbClient.updateCart(123, mockCart, true, function(err, result) {
                expect(result.items[1].productId).to.equal('4567');
                // expected 1234's quantity 1+2=3 instead of 45
                expect(result.items[1].quantity).to.equal(3);
            });
        });

        it('should sync child quantity with parent quantity of a new parent item', function() {

            mockCart = {
                '_id': 'mockCart',
                'items': [
                    {
                        'productId': '1234',
                        'quantity': 2,
                        'childProductId': '4567'
                    },
                    {
                        'productId': '4567',
                        'quantity': 45,
                        'parentProductId': '1234'
                    }
                ]
            };

            var mockCartRedis = {
                '_id': 'mockCart',
                'items':[]
            };

            sandbox.stub(client, 'set', function(id, mockCart, callback) {
                return callback(null, 'fake ok');
            });

            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, JSON.stringify(mockCartRedis));
            });

            dbClient.updateCart(123, mockCart, true, function(err, result) {
                expect(result.items[1].productId).to.equal('4567');
                // expected 1234's quantity 2 instead of child quantity
                expect(result.items[1].quantity).to.equal(2);
            });
        });

        it('should ignore child if child with the same id already belongs to another parent', function() {

            mockCart = {
                '_id': 'mockCart',
                'items': [
                    {
                        'productId': '1234',
                        'quantity': 2,
                        'childProductId': '4567'
                    },
                    {
                        'productId': '4567',
                        'quantity': 45,
                        'parentProductId': '1234'
                    },
                    {
                        'productId': '8901',
                        'quantity': 3,
                        'childProductId': '4567'
                    },
                    {
                        'productId': '4567',
                        'quantity': 45,
                        'parentProductId': '8901'
                    }
                ]
            };

            var mockCartRedis = {
                '_id': 'mockCart',
                'items':[]
            };

            sandbox.stub(client, 'set', function(id, mockCart, callback) {
                return callback(null, 'fake ok');
            });

            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, JSON.stringify(mockCartRedis));
            });

            dbClient.updateCart(123, mockCart, true, function(err, result) {
                expect(result.items).to.have.length('3');
            });
        });

        it('should increment parent quantity and match child quantity of an existing parent item', function() {

            mockCart = {
                '_id': 'mockCart',
                'items': [
                    {
                        'productId': '1234',
                        'quantity': 2,
                        'childProductId': '4567'
                    },
                    {
                        'productId': '4567',
                        'quantity': 45,
                        'parentProductId': '1234'
                    }
                ]
            };

            sandbox.stub(client, 'set', function(id, mockCart, callback) {
                return callback(null, 'fake ok');
            });

            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, JSON.stringify(mockCart));
            });

            dbClient.updateCart(123, mockCart, true, function(err, result) {
                expect(result.items[1].productId).to.equal('4567');
                // expected 1234's quantity 3 instead of 45
                expect(result.items[0].quantity).to.equal(3);
            });
        });

        it('should return an error is create cart fails', function() {

            sandbox.stub(client, 'set', function(id, mockCart, callback) {
                return callback('update cart error', null);
            });

            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, null);
            });

            dbClient.updateCart(123, mockCart, false, function(err, result) {
                expect(err.message).to.equal('Unable to create cart: update cart error');
            });
        });

        it('should return an error is update cart fails', function() {

            sandbox.stub(client, 'set', function(id, mockCart, callback) {
                return callback('update cart error', null);
            });

            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, JSON.stringify(mockCart));
            });

            dbClient.updateCart(123, mockCart, true, function(err, result) {
                expect(err.message).to.equal('Unable to update cart: update cart error');
            });
        });

        it('should return an error if getting redis client fails', function() {
            redisClient.getClient.restore();
            sandbox.stub(redisClient, 'getClient', function(callback) {
                return callback('getClient error', null);
            });

            dbClient.updateCart(123, mockCart, false, function(err, result) {
                expect(err.message).to.equal('getClient error');
            });
        });
    });

    describe('rename', function() {

        it('should rename a cart', function() {
            sandbox.stub(client, 'rename', function(oldKey, newKey, callback) {
                return callback(null, 'new_name');
            });

            dbClient.renameCartKey(123, 234, function(err, result) {
                expect(result).to.equal('new_name');
            });
        });

        it('should return an error if rename fails', function() {
            sandbox.stub(client, 'rename', function(oldKey, newKey, callback) {
                return callback('error', null);
            });

            dbClient.renameCartKey(123, 234, function(err, result) {
                expect(err instanceof Error).to.be.true;
            });
        });

        it('should return an error if getting redis client fails', function() {
            redisClient.getClient.restore();
            sandbox.stub(redisClient, 'getClient', function(callback) {
                return callback('getClient error', null);
            });

            dbClient.renameCartKey(123, 234, function(err, result) {
                expect(err.message).to.equal('getClient error');
            });
        });
    });

    describe('delete', function() {

        it('should delete a cart', function() {
            redisClient.getClient.restore();
            sandbox.stub(cache, 'getClient', function(callback) {
                return callback(null, client);
            });

            sandbox.spy(client, 'del', function(id) {
                return;
            });

            dbClient.deleteCart(123);

            expect(client.del.calledWithExactly(123)).to.be.true;
        });

        it('should not call redis if getting redis client fails', function() {
            redisClient.getClient.restore();
            sandbox.stub(redisClient, 'getClient', function(callback) {
                return callback('getClient error', null);
            });
            sandbox.spy(client, 'del', function(id) {
                return;
            });

            dbClient.deleteCart(123);

            expect(client.del.calledOnce).to.be.false;
        });

    });

    describe('get store', function() {

        it('should get store by ID', function() {
            sandbox.stub(client, 'get', function(id, callback) {
                return callback(null, '{ "store": "test" }');
            });

            dbClient.getStoreByExtStoreKey(123, function(err, result) {
                expect(result.store).to.be.equal('test');
            });
        });

        it('should return an error if get fails', function() {
            sandbox.stub(client, 'get', function(id, callback) {
                return callback('get error', null);
            });

            dbClient.getStoreByExtStoreKey(123, function(err, result) {
                expect(err.message).to.equal('Redis is not able to connect');
            });
        });

        it('should return an error if getClient fails', function() {
            redisClient.getClient.restore();
            sandbox.stub(redisClient, 'getClient', function(callback) {
                return callback('getClient error', null);
            });

            dbClient.getStoreByExtStoreKey(123, function(err, result) {
                expect(err.message).to.equal('Redis is not able to connect');
            });
        });

    });

    describe('create store', function() {

        it('should create store with external key', function(done) {
            sandbox.stub(client, 'psetex', function(redisKey, ttl, store, callback) {
                return callback(null, '{ "store": "test" }');
            });

            dbClient.createStore('fakeStoreKey', 'fakeStore', function(err, result) {
                expect(result).to.be.equal('fakeStore');
                done();
            });
        });

        it('should return an error if create fails', function() {
            sandbox.stub(client, 'psetex', function(edisKey, ttl, store, callback) {
                return callback('get error', null);
            });

            dbClient.createStore('fakeStoreKey', 'fakeStore', function(err) {
                expect(err.message).to.equal('Redis is not able to connect');
            });
        });

        it('should return an error if getClient fails', function() {
            redisClient.getClient.restore();
            sandbox.stub(redisClient, 'getClient', function(callback) {
                return callback('getClient error', null);
            });

            dbClient.createStore('fakeStoreKey', 'fakeStore', function(err, result) {
                expect(err.message).to.equal('Redis is not able to connect');
            });
        });

    });

});
