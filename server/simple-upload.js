let multer = require('multer');
let express = require('express');
let router = express.Router();
let utils = require('./utils');
let response = require('./response');
let path = require('path');
let model = require('./model');
let fs = require('fs');
let asyncEach = require('async/eachSeries');


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
    let fileData = [];
    let jsonPath = path.join(__dirname, '../', 'uploads', user.username, time + '.json');
    csv({noheader: true}).fromFile(filePath).on('json', function (row) {
        fileData.push(row);
    }).on('done', function (err) {
        // rename first colummn to WELL_NAME :TODO
        let finalData = [];
        fileData[0].field1 = "WELL_NAME";
        let header = fileData.splice(0, 1);
        asyncEach(fileData, function (data, next) {
            let obj = {};
            for (let i in data, header[0]) {
                obj[header[0][i]] = data[i];
            }
            finalData.push(obj);
            next();
        }, function () {
            fs.writeFileSync(jsonPath, JSON.stringify(finalData));
            fs.unlinkSync(filePath);
            console.log("End with Err : ", err)
        });
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