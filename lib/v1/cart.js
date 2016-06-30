'use strict';
var dbClient = require('../client/db_client.js'),
    cartConfig = require('config').cart,
    environmentName = require('config').serverConfig.environmentName,
    uuid = require('uuid'),
    pelicanOfferingClient = require('../client/pelican/offerings.js'),
    cartResponse = require('./cart-response.js'),
    _ = require('lodash'),
    logger = require('../utils/logger.js'),
    utils = require('../utils/util.js'),
    cookieSuffix = (environmentName === 'Prod') ? '' : environmentName;

exports.generateCartResponse = function(cartId, cartStorage, callback) {

    // Get Pelican Offerings and generate cart response
    if (cartStorage.items && cartStorage.items.length) {
        pelicanOfferingClient.getOfferingsByPriceIds(cartId.split('|')[1], _.pluck(cartStorage.items, 'productId'),
            function(err, response) {
                if (err) {
                    return callback(err);
                }
                cartResponse.createCartResponse(cartId, cartStorage, JSON.parse(response), function(err, cart) {
                    return err ? callback(err) : callback(null, cart);
                });
            });
    } else {
        return callback(null, {});
    }

};

/**
 * @api {get} /services/v1/cart/ GET method to get cart contents
 * @apiName getCart
 * @apiGroup Cart
 *
 * @apiDescription
 Get card method to fetch the cart and corresponding offerings. Expects cart_reference to identify the cart.

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/


 * @apiSuccessExample When the call is successful: Response Status Code:200
 * @apiFailureExample When the call fails: Response Status Code:500
 */

exports.getCartById = function(req, callback) {

    var cartId = req.params.cartId;

    // Find existing cart, return empty cart if none exists
    dbClient.getCartById(cartId, function(err, cartStorage) {
        if (err) {
            return callback(null, {});
        }

        exports.generateCartResponse(cartId, cartStorage, callback);
    });
};

/**
 * @api {post} /services/v1/cart/addItem Add an item to the cart
 * @apiName addItem
 * @apiGroup Cart
 *
 * @apiDescription
 Adds an item to the cart, if the item already exists the quantity is incremented.

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/addItem

 @apiParam {Number} productId The id of the product being added to the cart

 * @apiSuccessExample When the call is successful: Response Status Code:200
 * @apiFailureExample When the call fails: Response Status Code:500
 */

exports.addItem = function(req, cart, callback) {

    var productId = req.body.productId,
        cartItem = _.find(cart.items, {productId: productId});

    if (cartItem) {

        cartItem.quantity += 1;

    } else {
        //add item to cart
        cart.items.push({productId: productId, quantity: 1});
    }
    return callback(null, cart);
};

/**
 * @api {delete} /services/v1/cart/removeItem/:productId
 * @apiName removeItem
 * @apiGroup Cart
 *
 * @apiDescription
 removes a specified item (productId) from the cart

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/removeItem/1234

 @apiParam {String} productId Product to be removed from the cart

 * @apiSuccessExample When the call is successful: Response Status Code:200 (returns a copy of the cart)
 * @apiFailureExample When the call fails: Response Status Code:500
 */

exports.removeItem = function(req, cart, callback) {

    var productId = req.params.productId,
        removedItem = _.remove(cart.items, function(item) {
            return item.productId === productId || item.parentProductId === productId;
        });

    return removedItem.length ? callback(null, cart) : callback(new Error('Unable to update cart'));
};

/**
 * @api {put} /services/v1/cart/updateQuantity/:productId
 * @apiName updateQuantity
 * @apiGroup Cart
 *
 * @apiDescription
 If an item exists in the cart, the quantity is updated by the provided amount, up to a limit set in config.cart.maxCartItemQuantity.

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/updateQuantity/12345

 @apiParam {String} productId This is the required ID of the product you intend to update
 @apiHeader {Number} quantity The new quantity

 * @apiSuccessExample When the call is successful: Response Status Code:200 (returns a copy of the cart)
 * @apiFailureExample When the call fails: Response Status Code:500
 */

exports.updateQuantity = function(req, cart, callback) {

    var productId = req.params.productId,
        quantity = req.body.quantity,
        absoluteQuantity = Math.abs(Math.round(quantity)),
        maxCartItemQuantity = cartConfig.maxCartItemQuantity || 999,
        cartItem = _.find(cart.items, {productId: productId}),
        childCartItem;

    if (!cartItem) {
        return callback(new Error('Unable to update item quantity. Item not found.'));
    }

    if (cartItem && cartItem.parentProductId) {
        return callback(new Error('Child item quantity update not allowed'));
    }

    if (cartItem.childProductId) {
        childCartItem = _.find(cart.items, {productId: cartItem.childProductId});
    }

    if (quantity) {
        cartItem.quantity = (absoluteQuantity < maxCartItemQuantity) ? absoluteQuantity : maxCartItemQuantity;
        if (childCartItem) {
            childCartItem.quantity = cartItem.quantity;
        }
    } else {
        _.remove(cart.items, {productId: productId});
        if (childCartItem) {
            _.remove(cart.items, {productId: cartItem.childProductId});
        }
    }

    return callback(null, cart);
};

/**
 * @api {post} /services/v1/cart/addPromotion Add a promotion to the cart
 * @apiName addPromotion
 * @apiGroup Cart
 *
 * @apiDescription
 Adds an promotion to the cart.

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/addPromotion

 @apiHeader {String} promotion to be added to the cart.

 * @apiSuccessExample When the call is successful: Response Status Code:200
 * @apiFailureExample When the call fails: Response Status Code:500
 */

exports.addPromotion = function(req, cart, callback) {

    var promotion = req.body.promotion;

    if (promotion && cart.promotions && cart.promotions.indexOf(promotion) === -1) {
        //If promotion is not already present add promotion
        cart.promotions.push(promotion);

    } else if (!cart.promotions) {
        //if the promotion array doesn't already exist, create it
        cart.promotions = [promotion];

    }

    return callback(null, cart);
};

/**
 * @api {delete} /services/v1/cart/removePromotion/:promotionId
 * @apiName removePromotion
 * @apiGroup Cart
 *
 * @apiDescription
 removes a specified promotion (promotionId) from the cart

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/removePromotion/1234

 @apiParam {String} promotionId Promotion to be removed from the cart

 * @apiSuccessExample When the call is successful: Response Status Code:200 (returns a copy of the cart)
 * @apiFailureExample When the call fails: Response Status Code:500
 */

exports.removePromotion = function(req, cart, callback) {

    var promotion = req.params.promotion,
        promotionIndex = cart.promotions.indexOf(promotion);

    cart.promotions.splice(promotionIndex, 1);

    return callback(null, cart);

};

/**
 * @api {get} /services/v1/cart/:cartId/count Retrieve item count from cart
 * @apiName getCartItemCount
 * @apiGroup Cart
 *
 * @apiDescription
 Retrieves item count for a specified cart

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/12345/count

 @apiParam {String} cartId ID of the cart.
 * */

exports.getCartItemCount = function(req, callback) {
    var cartId = req.params.cartId,
        itemCount = 0;

    // Find existing cart and return item count, return count as 0 in all other cases.
    dbClient.getCartById(cartId, function(err, cartStorage) {

        if (cartStorage && cartStorage.items) {
            cartStorage.items.forEach(function(item) {
                itemCount += item.quantity;
            });
        }

        return callback(null, {count: itemCount});
    });
};

/**
 * @api {put} /services/v1/cart/updateKey updateKey method returns renews
 * user keys.
 * @apiName updateKey
 * @apiGroup cart
 *
 * @apiDescription
 * * Old key is stored in req.cookies.cart_reference.
 * * oxygenId URL param store's new key.
 *
 * @apiParam{string} anonymous user key to be converted to o2 user key
 *
 * @param req
 * @param res
 *
 * return - 200 status code.
 */

exports.updateKey = function(req, res, callback) {

    var cookie = req.cookies['cartReference' + cookieSuffix],
        domain = exports.getDomain(req.get('host')),
        oxygenId = req.params.oxygenId;

    if (!oxygenId || !cookie) {
        logger.debug('COOKIE OR O2 DOES NOT EXIST IN COOKIE :  V1/CART.JS');
        return callback(new Error('COOKIE OR O2 DOES NOT EXIST IN COOKIE :  V1/CART.JS'), res);
    }

    cookie = cookie.split(';')[0];
    oxygenId = req.params.oxygenId.split(';')[0];

    dbClient.renameCartKey(cookie, oxygenId, function(err) {
        if (err) {
            logger.debug('cart.js : updateKey : ', err.stack);
            return callback(new Error('cart.js : updateKey : ' + err.stack), res);
        }

        exports.setCartCookie(res, cookieSuffix, true, oxygenId, domain);
        return callback(null, res);
    });
};

/**
 * @api {get} /services/v1/cart/r Redirect method to create a cart
 * @apiName redirectCart
 * @apiGroup Cart
 *
 * @apiDescription
 Redirect method to create a cart.

 Sample Request:
 http://localhost:3001/services/v1/cart/r?storeKey=NAMER&productIds=4369,123123&lang=EN

 -Make sure there is a product ID otherwise the function will return a 500.

 @apiParam {String} productId This is the required ID of the product you intend to add to the cart
 @apiParam {String} country Country Code (2 chars)
 @apiParam {String} language Language Code (2 chars)

 * @apiSuccessExample When the call is successful: Response Status Code:302 (redirect to /cart)
 * @apiFailureExample When the call fails: Response Status Code:302 (redirect to /cart/error)
 */

exports.redirectCart = function(request, response, callback) {

    if (!request.query.productIds) {
        logger.debug('productIds is undefined.');
        return callback(new Error('productIds is undefined.'));
    }

    //Extracting information out of request
    var productIds = request.query.productIds.match(/(\d{3,}|\[\d{3,},\d{3,}])+/g), //The reference to the product to be added
        promotions = request.query.promotions, // Cart promo codes
        userExtKey = request.query.userExtKey,
        storeKey = request.query.storeKey,
        domain = exports.getDomain(request.get('host')),

    //Other necessary vars
        cartReference = request.cookies['cartReference' + cookieSuffix], //Reference to an previously created cart, "T" identified user's cart, "F" anonymous cart
        cart = new CartStore('active', promotions, _.uniq(productIds)),
        mergeCart = true,
        cartReferenceParts,
        userIdentified,
        newCartId,
        cartRedisKey,
        storeChanged;

    //Split cart reference into the cart ID portion and user identified flag
    if (cartReference) {

        cartReferenceParts = cartReference.split(';');
        cartRedisKey = cartReferenceParts[0]; //id for user cart
        var cartStoreKey = cartRedisKey.split('|')[1];
        storeChanged = cartStoreKey !== storeKey;
        userIdentified = cartReferenceParts[1] === 'T'; //Is this a known o2 user cart? (T) or an anonymous cart? (F)
    }

    //If we have an o2 id in the session and an unidentified/anonymous cart
    if (userExtKey && !userIdentified && !storeChanged) {
        //MERGE happens here
        newCartId = userExtKey + '|' + storeKey;
        //set cart reference to known user cart 'T'
        exports.setCartCookie(response, cookieSuffix, true, newCartId, domain);
        return callback(null, {});

    } else if (cartRedisKey && !storeChanged) { //We a received a cartRedisKey from the cartReference cookie

        //Update the existing cart
        dbClient.updateCart(cartRedisKey, cart, mergeCart, function(error, result) {
            return callback(null, result);
        });

    } else { //If we don't have a cart or user switched stores, we create one. If an o2 id is available we create the Id from that, otherwise we generate one.
        //create cart/write to new cart
        cartRedisKey = uuid.v4() + '|' + storeKey; //cartRedisKey = random uuid + - + The pelican store key
        //set cart reference to unknown user cart "F"
        logger.debug('Response set cart cookie domain', domain);
        exports.setCartCookie(response, cookieSuffix, false, cartRedisKey, domain);
        //Create the new cart in the DB
        dbClient.createCart(cartRedisKey, cart, function(error, result) {
            return callback(null, result);

        });
    }

};

/**
 * @api {delete} /services/v1/cart/:cartId
 * @apiName deleteCart
 * @apiGroup Cart
 *
 * @apiDescription
 Deletes a cart from the redis DB

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/1234

 @apiParam {String} cartId the cart to be deleted

 * @apiSuccessExample When the call is successful: Response Status Code:204
 * @apiFailureExample When the call fails: Response Status Code:500
 */

exports.deleteCart = function(req, res, callback) {

    dbClient.deleteCart(req.params.cartId, function(error, result) {
        if (error) {
            return callback(error);
        }

        return callback(null, res);
    });

};

exports.updateCart = function(requestName, req, callback) {

    var cartId = req.params.cartId,
        mergeCart = false,
        updateLogic = this[requestName];

    //Find existing cart using the cart id
    dbClient.getCartById(cartId, function(err, cart) {

        if (err) {
            return callback(err);
        }

        //Call cart method to perform action on cart
        updateLogic(req, cart, function(err, modifiedCart) {

            if (err) {
                return callback(err);
            }

            //Write updated cart to database
            dbClient.updateCart(cartId, modifiedCart, mergeCart, function(err, cartStorage) {

                if (err) {
                    return callback(err);
                }

                return exports.generateCartResponse(cartId, cartStorage, callback);

            });

        });

    });
};

exports.getDomain = function(host) {
    return host.match(/\.autodesk.*/) ? host.match(/\.autodesk.*/)[0] : '';
};

exports.setCartCookie = function(response, cookieSuffix, identifiedCart, cartRedisKey, domain) {
    var cartIdentifier = (identifiedCart) ? ';T' : ';F';
    return response.cookie('cartReference' + cookieSuffix, cartRedisKey + cartIdentifier, {domain: domain});
};

//CartStore Class
function CartStore(state, promotions, items) {

    this.state = state;
    this.promotions = promotions ? promotions : [];
    this.items = [];

    items.forEach(function(item) {
        var itemGroupArray = item.match(/(\d{3,})+/g);
        if (itemGroupArray.length > 1) {

            this.items.push({productId: itemGroupArray[0], childProductId: itemGroupArray[1], quantity: 1});
            this.items.push({productId: itemGroupArray[1], parentProductId: itemGroupArray[0], quantity: 1});

        } else {
            this.items.push({productId: item, quantity: 1});
        }

    }, this);
}
