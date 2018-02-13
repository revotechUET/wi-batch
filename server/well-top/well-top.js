let express = require('express');
let router = express.Router();
let model = require('../model/index');
let response = require('../response');
let path = require('path');
let fs = require('fs');
let asyncEachSeries = require('async/eachSeries');
let config = require('config');
let request = require('request');
const fileType = "WELL_TOP";
router.post('/list-file', function (req, res) {
    model.UserFileUploaded.findAll({
        where: {
            username: req.decoded.username,
            type: fileType
        }
    }).then(files => {
        res.send(response(200, "Successfull", files));
    });
});

router.post('/info', function (req, res) {
    model.UserFileUploaded.findById(req.body.idUserFileUploaded).then(file => {
        if (file) {
            let filePath = path.join(__dirname, '../../', 'uploads', req.decoded.username, file.uploadedTime + '.json');
            file = file.toJSON();
            file.data = JSON.parse(fs.readFileSync(filePath).toString());
            res.send(response(200, "Successfull", file));
        } else {
            res.send(response(512, "No header file found by id"));
        }
    });
});

router.post('/delete', function (req, res) {
    model.UserFileUploaded.findById(req.body.idUserFileUploaded).then(file => {
        if (file) {
            file.destroy().then(() => {
                let filePath = path.join(__dirname, '../../', 'uploads', req.decoded.username, file.uploadedTime + '.json');
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                res.send(response(200, "Successfull", file));
            });
        } else {
            res.send(response(512, "No header file found by id"));
        }
    });
});

router.post('/run', function (req, res) {
    model.UserFileUploaded.findById(req.body.idUserFileUploaded).then(file => {
        if (file) {
            let wells = [];
            let projectName = req.body.projectName;
            let filePath = path.join(__dirname, '../../', 'uploads', req.decoded.username, file.uploadedTime + '.json');
            if (!fs.existsSync(filePath)) {
                res.send(response(512, "No data found by this file", {}));
            } else {
                let rows = JSON.parse(fs.readFileSync(filePath).toString());
                asyncEachSeries(rows, function (row, nextWell) {
                    let well = {
                        name: row.WELLS,
                        depths: []
                    };
                    delete row.WELLS;
                    for (let i in row) {
                        if (row[i]) well.depths.push(row[i]);
                    }
                    wells.push(well);
                    nextWell();
                }, function () {
                    let options = {
                        method: 'POST',
                        url: 'http://' + config.app.backendHost + ':' + config.app.backendPort + '/project/well/well-top-update',
                        headers: {
                            'Cache-Control': 'no-cache',
                            Authorization: req.token,
                            'Content-Type': 'application/json'
                        },
                        body: {project: projectName, wells: wells},
                        json: true
                    };
                    request(options, function (error, resp, body) {
                        if (error) {
                            res.send(error);
                        } else {
                            res.send(body);
                        }
                    });

                });
            }
        } else {
            res.send(response(512, "No header file found by id"));
        }
    });
});

module.exports = router;