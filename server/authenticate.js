let configApp = require('config').app;
let jwt = require('jsonwebtoken');
let responseJSON = require('./response');
let model = require('./model');


module.exports = function () {
    return function (req, res, next) {
        let token = req.body.token || req.query.token || req.header['x-access-token'] || req.get('Authorization');
        if (token) {
            jwt.verify(token, configApp.jwtSecretKey, function (err, decoded) {
                if (err) {
                    res.status(401).send(responseJSON(512, "Authentication failed", "Authentication failed"));
                } else {
                    req.decoded = decoded;
                    console.log("Passed");
                    next();
                }
            });
        } else {
            res.status(401).send(responseJSON(512, "No Token Provided"));
        }
    }
}