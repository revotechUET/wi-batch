let multer = require('multer');
let express = require('express');
let router = express.Router();
let utils = require('./utils');
let response = require('./response');
let path = require('path');
let model = require('./model');
let fs = require('fs');


let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(path.join(__dirname, '../', 'uploads', req.decoded.username))) {
            fs.mkdirSync(path.join(__dirname, '../', 'uploads', req.decoded.username));
        }
        cb(null, 'uploads/' + req.decoded.username);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + req.decoded.username + '-' + file.originalname);
    }
});

let upload = multer({storage: storage});

function processingCSVFile(file, user, callback) {
    let filePath = path.join(__dirname, '../', file.path);
    const csv = require('csvtojson');
    let time = Date.now().toString();
    let jsonData = [];
    let jsonPath = path.join(__dirname, '../', 'uploads', user.username, time + '.json');
    csv().fromFile(filePath).on('json', function (row) {
        jsonData.push(row);
    }).on('done', function (err) {
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData));
        fs.unlinkSync(filePath);
        console.log("End with Err : ", err)
    });
    model.UserFileUploaded.create({
        uploadedTime: time,
        fileName: file.originalname,
        type: "WELL_HEADER",
        username: user.username
    }).then((f) => {
        callback(null, f);
    }).catch(err => {
        callback(err, null);
    });
}


router.post('/upload', upload.single('file'), async function (req, res) {
    let user = (await utils.createUser(req.decoded))[0];
    utils.toUpCaseFile(req.file, function (err, file) {
        if (!err) {
            processingCSVFile(file, user, function (err, success) {
                res.send(response(200, "Successfull", success));
            });
        } else {
            res.send(response(512, "Error occurred", err));
        }
    });
});

module.exports = router;