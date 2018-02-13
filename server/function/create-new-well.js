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
            callback(null, body);
        }
    });
};

module.exports = function (data, token, callback, username) {
    let response = {};
    response.idProject = null;
    response.wells = [];
    let queue = asyncQueue(function (well, cb) {
        makeImportWellRequest({
            name: well.wellName,
            idWell: well.idWell,
            projectName: data.projectName
        }, token, function (err, done) {
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
                response.wells.push({well: well.wellName, result: err.code + " - " + err.reason});
            } else {
                console.log(done);
                response.idProject = done.content.idProject ? done.content.idProject : response.idProject;
                response.wells.push({well: done.content, result: done.reason});
            }
        });
    });
};