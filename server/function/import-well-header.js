let request = require('request');
let config = require('config');
let asyncQueue = require('async/queue');
let asyncEach = require('async/each');
let model = require('../model');

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
};

function findWellByName(wellname, token, callback) {
    let options = new Options('/user/well/findbyname', token, {wellname: wellname});
    request(options, function (error, response, body) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, body.content);
        }
    });
};

function updateWellHeader(data, token, callback) {
    let options = new Options('/user/well/editHeader', token, data);
    request(options, function (error, response, body) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, body);
        }
    });
};

module.exports = function (wells, token, callback, username) {
    let reponse = [];
    asyncEach(wells, function (well, next) {
        findWellByName(well.WELL_NAME, token, function (err, foundWell) {
            if (err) {
                next(err);
            } else {
                if (foundWell && JSON.stringify(foundWell) != '{}') {
                    let queue = asyncQueue(function (data, callback) {
                        updateWellHeader(data, token, function (err, done) {
                            if (err) console.log(err);
                            callback(done);
                        });
                    }, 3);
                    queue.drain = async function () {
                        console.log("ALL HEADER FOR " + foundWell.name + " DONE");
                        await model.WellHeader.findOrCreate({
                            where: {wellName: foundWell.name, idWell: foundWell.idWell, username: username},
                            defaults: {
                                wellName: foundWell.name,
                                idWell: foundWell.idWell,
                                header: well,
                                username: username
                            }
                        });
                        reponse.push(foundWell.name);
                        next();
                    };
                    for (let header in well) {
                        queue.push({idWell: foundWell.idWell, header: header, value: well[header]}, function (res) {
                            // console.log(res.reason);
                        });
                    }
                } else {
                    console.log("No well found by name ", well.NAME);
                    next();
                }
            }
        });
    }, function (err) {
        if (err) {
            console.log(err);
        }
        callback(null, reponse);
    });
};