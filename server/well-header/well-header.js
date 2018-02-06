let express = require('express');
let router = express.Router();
let model = require('../model/index');
let response = require('../response');
let path = require('path');
let fs = require('fs');
let importWellHeader = require('../function/import-well-header');

const fileType = "WELL_HEADER";
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

router.post('/list-success', function (req, res) {
    model.WellHeader.findAll({
        where: {
            username: req.decoded.username
        }
    }).then(wells => {
        res.send(response(200, "Successfull", wells));
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
            let filePath = path.join(__dirname, '../../', 'uploads', req.decoded.username, file.uploadedTime + '.json');
            if (!fs.existsSync(filePath)) {
                res.send(response(512, "No data found by this file", {}));
            } else {
                let wells = JSON.parse(fs.readFileSync(filePath).toString());
                importWellHeader(wells, req.token, function (err, success) {
                    if (err) {

                        res.send(response(512, "Error", err));
                    } else {
                        res.send(response(200, "Successfull", success));
                    }
                }, req.decoded.username);
            }
        } else {
            res.send(response(512, "No header file found by id"));
        }
    });
});

module.exports = router;