'use strict';
var express = require('express'),
    router = express.Router(),
    _ld = require('lodash-node'),
    corsConfig = require('config'),
    frontEndUrl = corsConfig.siteFrontEndUrl,
    handleRequest = require('../../../lib/utils/response.js').handleRequest,
    auth = require('../../../lib/auth/auth.js'),
    cart = require('../../../lib/v1/cart.js'),
    handleResponse = require('../../../lib/utils/response.js');

//Add authorization headers
/*
 * Adding authorization headers.
 *
 * Notice because this is a cross domain call
 * Origin can't be set to a wildcard.
 *
 */
router.use('*', function(req, res, next) {

    if (_ld.has(corsConfig, 'corsEnabled')) {
        res.header('Access-Control-Allow-Origin', frontEndUrl.match(/localhost/) ? frontEndUrl : '*');
    }

    res.header('Access-Control-Allow-Headers', 'X-Requested-With,Authorization,Content-Type');
    res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, PUT, DELETE, POST');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Strict-Transport-Security', 'max-age=' + corsConfig.hstsMaxAge);
    next();
});

/**
 * @api {get} /services/v1/cart/r Redirect method to create a cart
 * @apiName redirectCart
 * @apiGroup Cart
 *
 * @apiDescription
 Redirect method to create a cart until we implement the JSONP solution.

 Sample Request:
 http://localhost:3001/services/v1/cart/r?storeKey=NAMER&productId=4369,123123&lang=EN&signature=cjuUH4AN4Sjz8sJwrp4zgMsoCIzDoRYAokB6mqMu09E%3D&timestamp=2015-03-20T23:08:26.496Z

 Steps to generate. Use the hmac function to generate a hash with one of the keys in default.json
 and a current timestamp (make sure to store the timestamp). Then make a request with that hash (token)
 and time stamp as url params. Then the request will be considered valid.

 -Make sure there is a product ID otherwise the function will return a 500.

 @apiParam {String} productId This is the required ID of the product you intend to add to the cart
 @apiParam {String} country Country Code (2 chars)
 @apiParam {String} language Language Code (2 chars)

 * @apiSuccessExample When the call is successful: Response Status Code:302 (redirect to /cart)
 */

router.get('/r', handleResponse.cartRedirectHandler.bind(cart, 'redirectCart'));

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

 * @apiSuccessExample When the call is successful: Response Status Code:200 (returns a copy of the cart)
 {
    {
        "itemCount": 5;
    }
 }*/

router.get('/:cartId/count', handleResponse.setJson.bind(cart, 'getCartItemCount'));

/**
 * @api {get} /services/v1/cart/:cartId GET method to get cart contents
 * @apiName getCart
 * @apiGroup Cart
 *
 * @apiDescription
 Get card method to fetch the cart and corresponding offerings. Expects cart_reference to identify the cart.

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/1234


 * @apiSuccessExample When the call is successful: Response Status Code:200
 {
    "lineItems": [
        {
            "offeringId": "4535",
            "productName1": "Autodesk Maya LT",
            "productName2": "with Advanced Support",
            "planType": "Annual Subscription",
            "externalKey": "MAYALT-BASIC",
            "shortDescription": "Autodesk Maya LT with Advanced Support and Annual Subscription",
            "platform": "",
            "deliveryMethod": "ELD",
            "quantity": 1,
            "productYear": "2015",
            "unitPrice": "30.00"
        },
        {
            "offeringId": "4369",
            "productName1": "Autodesk AutoCAD",
            "productName2": "with Basic Support",
            "planType": "Meta Subscription",
            "externalKey": "META-ACD-BASIC",
            "shortDescription": "Autodesk AutoCAD LT with Basic Support and Meta Subscription",
            "platform": "",
            "deliveryMethod": "ELD",
            "quantity": 2,
            "productYear": "2014",
            "unitPrice": "300.00"
        }
    ],
    "promotions": []
}*/

router.get('/:cartId?', handleResponse.setJson.bind(cart, 'getCartById'));

/**
 * @api {post} /services/v1/cart/cartId:/items Add an item to the cart
 * @apiName addItem
 * @apiGroup Cart
 *
 * @apiDescription
 Adds an item to the cart, if the item already exists the quantity is incremented.

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/1234/items

 @apiParam {Number} productId The id of the product being added to the cart

 * @apiSuccessExample When the call is successful: Response Status Code:200
 {
     "lineItems": [
         {
             "offeringId": "4535",
             "productName1": "Autodesk Maya LT",
             "productName2": "with Advanced Support",
             "planType": "Annual Subscription",
             "externalKey": "MAYALT-BASIC",
             "shortDescription": "Autodesk Maya LT with Advanced Support and Annual Subscription",
             "platform": "",
             "deliveryMethod": "ELD",
             "quantity": 1,
             "productYear": "2015",
             "unitPrice": "30.00"
         },
         {
             "offeringId": "4369",
             "productName1": "Autodesk AutoCAD",
             "productName2": "with Basic Support",
             "planType": "Meta Subscription",
             "externalKey": "META-ACD-BASIC",
             "shortDescription": "Autodesk AutoCAD LT with Basic Support and Meta Subscription",
             "platform": "",
             "deliveryMethod": "ELD",
             "quantity": 2,
             "productYear": "2014",
             "unitPrice": "300.00"
         }
     ],
     "promotions": []
 }*/

router.post('/:cartId/items', handleResponse.cartUpdateHandler.bind(cart, 'addItem'));

/**
 * @api {put} /services/v1/cart/:cartId/items/:productId Update the quantity of an item in the cart
 * @apiName updateQuantity
 * @apiGroup Cart
 *
 * @apiDescription
 If an item exists in the cart, the quantity is updated by the provided amount, up to a limit set in config.cart.maxCartItemQuantity.

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/1234/items/12345

 @apiParam {String} productId This is the required ID of the product you intend to update
 @apiHeader {Number} quantity The new quantity

 * @apiSuccessExample When the call is successful: Response Status Code:200 (returns a copy of the cart)
 {
     "lineItems": [
         {
             "offeringId": "4535",
             "productName1": "Autodesk Maya LT",
             "productName2": "with Advanced Support",
             "planType": "Annual Subscription",
             "externalKey": "MAYALT-BASIC",
             "shortDescription": "Autodesk Maya LT with Advanced Support and Annual Subscription",
             "platform": "",
             "deliveryMethod": "ELD",
             "quantity": 1,
             "productYear": "2015",
             "unitPrice": "30.00"
         },
         {
             "offeringId": "4369",
             "productName1": "Autodesk AutoCAD",
             "productName2": "with Basic Support",
             "planType": "Meta Subscription",
             "externalKey": "META-ACD-BASIC",
             "shortDescription": "Autodesk AutoCAD LT with Basic Support and Meta Subscription",
             "platform": "",
             "deliveryMethod": "ELD",
             "quantity": 2,
             "productYear": "2014",
             "unitPrice": "300.00"
         }
     ],
     "promotions": []
 } */

router.put('/:cartId/items/:productId', handleResponse.cartUpdateHandler.bind(cart, 'updateQuantity'));

/**
 * @api {put} /services/v1/cart/cartId:/promotions/ Add a promotion to an existing cart
 * @apiName removePromotion
 * @apiGroup Cart
 *
 * @apiDescription
 removes a specified promotion (promotionId) from the cart

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/12345/promotions

 @apiParam {String} promotionId Promotion to be removed from the cart

 * @apiSuccessExample When the call is successful: Response Status Code:200 (returns a copy of the cart)
 {
    "lineItems": [
        {
            "offeringId": "4535",
            "productName1": "Autodesk Maya LT",
            "productName2": "with Advanced Support",
            "planType": "Annual Subscription",
            "externalKey": "MAYALT-BASIC",
            "shortDescription": "Autodesk Maya LT with Advanced Support and Annual Subscription",
            "platform": "",
            "deliveryMethod": "ELD",
            "quantity": 1,
            "productYear": "2015",
            "unitPrice": "30.00"
        },
        {
            "offeringId": "4369",
            "productName1": "Autodesk AutoCAD",
            "productName2": "with Basic Support",
            "planType": "Meta Subscription",
            "externalKey": "META-ACD-BASIC",
            "shortDescription": "Autodesk AutoCAD LT with Basic Support and Meta Subscription",
            "platform": "",
            "deliveryMethod": "ELD",
            "quantity": 2,
            "productYear": "2014",
            "unitPrice": "300.00"
        }
    ],
    "promotions": []
}*/

router.put('/:cartId/promotions', handleResponse.cartUpdateHandler.bind(cart, 'addPromotion'));

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
 * @apiSuccessExample When the call is successful: Response Status Code:204 (no content)
 */

router.put('/updateKey/:oxygenId', handleResponse.cartKeyHandler.bind(cart, 'updateKey'));

/**
 * @api {delete} /services/v1/cart/:cartId/promotions/:promotionId Remove a promotion from the cart
 * @apiName removePromotion
 * @apiGroup Cart
 *
 * @apiDescription
 removes a specified promotion (promotionId) from the cart

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/12345/promotions/testPromotion

 @apiParam {String} promotionId Promotion to be removed from the cart

 * @apiSuccessExample When the call is successful: Response Status Code:200
 {
   "lineItems": [
       {
           "offeringId": "4535",
           "productName1": "Autodesk Maya LT",
           "productName2": "with Advanced Support",
           "planType": "Annual Subscription",
           "externalKey": "MAYALT-BASIC",
           "shortDescription": "Autodesk Maya LT with Advanced Support and Annual Subscription",
           "platform": "",
           "deliveryMethod": "ELD",
           "quantity": 1,
           "productYear": "2015",
           "unitPrice": "30.00"
       },
       {
           "offeringId": "4369",
           "productName1": "Autodesk AutoCAD",
           "productName2": "with Basic Support",
           "planType": "Meta Subscription",
           "externalKey": "META-ACD-BASIC",
           "shortDescription": "Autodesk AutoCAD LT with Basic Support and Meta Subscription",
           "platform": "",
           "deliveryMethod": "ELD",
           "quantity": 2,
           "productYear": "2014",
           "unitPrice": "300.00"
       }
   ],
   "promotions": ["promotion"]
}*/

router.delete('/:cartId/promotions/:promotionId', handleResponse.cartUpdateHandler.bind(cart, 'removePromotion'));

/**
 * @api {delete} /services/v1/cart/:cartId/items/:productId Remove an item from the cart
 * @apiName removeItem
 * @apiGroup Cart
 *
 * @apiDescription
 removes a specified item (productId) from the cart

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/1234/items/1234

 @apiParam {String} productId Product to be removed from the cart

 * @apiSuccessExample When the call is successful: Response Status Code:200 (returns a copy of the cart)
 {
    "lineItems": [
        {
            "offeringId": "4535",
            "productName1": "Autodesk Maya LT",
            "productName2": "with Advanced Support",
            "planType": "Annual Subscription",
            "externalKey": "MAYALT-BASIC",
            "shortDescription": "Autodesk Maya LT with Advanced Support and Annual Subscription",
            "platform": "",
            "deliveryMethod": "ELD",
            "quantity": 1,
            "productYear": "2015",
            "unitPrice": "30.00"
        }
    ],
    "promotions": []
}*/

router.delete('/:cartId/items/:productId', handleResponse.cartUpdateHandler.bind(cart, 'removeItem'));

/**
 * @api {delete} /services/v1/cart/:cartId Deletes the cart from the database
 * @apiName deleteCart
 * @apiGroup cart
 *
 * @apiDescription
 Deletes a cart from the redis DB

 Sample Request:
 https://cart-dev.aws.autodesk.com/services/v1/cart/1234

 @apiParam {String} cartId the cart to be deleted

 * @apiSuccessExample When the call is successful: Response Status Code:204
 * @apiFailureExample When the call fails: Response Status Code:500
 */

router.delete('/:cartId', handleResponse.cartKeyHandler.bind(cart, 'deleteCart'));

module.exports = router;
