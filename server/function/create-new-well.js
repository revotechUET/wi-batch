let request = require('request');
let config = require('config');
let asyncQueue = require('async/queue');

class Options {
    constructor(path, token, payload) {
        this.method = 'POST';
        this.url = 'http://' + config.app.backendHost + ':' + config.app.backendPort + path;
        this.headers = {
            'Cache-Control': 'no-cache',
            Authorization: token,
            'Content-Type': 'application/json'
        };
        this.body = payload;
        this.json = true;
    }
};

function makeImportWellRequest(well, token, callback) {
    let options = new Options('/project/well/import-from-inventory', token, well);
    request(options, function (error, response, body) {
        if (error) {
            callback(error, null);
        } else {
            console.log(body);
            callback(null, body.content);
        }
    });
};

module.exports = function (data, token, callback, username) {
    let response = [];
    let queue = asyncQueue(function (well, cb) {
        makeImportWellRequest({
            name: well.wellName,
            idWell: well.idWell,
            projectName: data.projectName
        }, token, function (err, done) {
            console.log("Make request : ", well.wellName);
            cb(err, done);
        });
    }, 1);
    queue.drain = function () {
        console.log("ALL well done");
        callback(null, response);
    };
    data.wells.forEach(function (well) {
        queue.push(well, function (err, done) {
            if (err) {
                response.push({well: well.wellName, result: "Error : " + err.message});
            } else {
                response.push({well: well.wellName, result: "Successfull : " + JSON.stringify(done)});
            }
        });
    });
};