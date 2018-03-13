let request = require('request');
let config = require('config');

class Options {
    constructor(path, token, payload) {
        this.method = 'POST';
        this.url = 'http://' + config.app.oInvHost + ':' + config.app.oInvPort + path;
        this.headers = {
            'Cache-Control': 'no-cache',
            Authorization: token,
            'Content-Type': 'application/json'
        };
        this.body = payload;
        this.json = true;
    }
}

module.exports = function (curveNames, token, callback) {
    let options = new Options('/user/well/dataset/curve/find-well', token, curveNames);
    request(options, function (error, response, body) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, body);
        }
    });
};