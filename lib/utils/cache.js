'use strict';
var redis = require('redis');
var redisNode = require('config').sessionConfig.redisNode;
var logger = require('../utils/logger.js');
var cluster = require('cluster');
var redisClient;
global.redisClient;

/*
 Gets a client from redis, looking for the redisNode on the config file and connect.
 If not responsive, returns an error on the callback.
 */
exports.getClient = function(callback) {
    createClient(redisNode.port, redisNode.hostname, function(err, client) {
        if (err) {
            logger.debug('An error happened while trying to connect to redis node ' + redisNode.hostname + ':: ' + err);
            return callback(new Error('Redis is not able to connect'));
        }
        return callback(null, client);

    });
};

/*
 Creates a client on redis.
 */
function createClient(port, hostname, callback) {
    if (!redisClient) {
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        var tempClient = redis.createClient(port, hostname, {no_ready_check: true});
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
        tempClient.on('error', function(err) {
            tempClient.end();
            return callback(new Error('Redis is not able to connect'));

        });
        tempClient.on('ready', function() {
            logger.debug('Redis Client is created for Worker :' + cluster.worker.id);
            redisClient = tempClient;
            return callback(null, redisClient);
        });
    } else {
        return callback(null, redisClient);
    }

}
