'use strict';
let express = require('express');
let uuidv5 = require('uuid/v5');
let router = express.Router();
let fs = require('fs');
let path = require('path');
let cors = require('cors');
let responseJSON = require('./response');
let utils = require('./utils');

let _transactions = new Object();

let BASEPATH = path.join(__dirname, '../', 'uploads');

const NAMESPACE = '5b671a64-80d5-491e-9ab0-da01ff8f3341';
router.use(cors());
router.use(express.json({limit: "5mb"}));

router.get('/chunked-upload', function (req, res) {
    res.send("Hello world " + JSON.stringify(req.decoded));
});

router.post('/chunked-upload', function (req, res) {
    let fileType = req.body.fileName.substring(req.body.fileName.lastIndexOf('.'));
    if (fileType != '.zip') {
        res.status(400).send(responseJSON(512, "Not zip file"));
    } else {
        let username = req.decoded.username;
        if (!fs.existsSync(path.join(BASEPATH, username))) {
            fs.mkdirSync(path.join(BASEPATH, username));
        }

        let transactionId = req.body.transactionId;
        let transaction;
        if (!transactionId) {
            transactionId = uuidv5('req.body.fileName', NAMESPACE);
            transaction = _transactions[transactionId];
            if (transaction) {
                fs.closeSync(transaction.targetFile);
                delete _transactions[transactionId];
            }
            transaction = {
                fileName: req.body.fileName,
                fileType: req.body.fileType,
                targetFile: fs.openSync(path.join(BASEPATH, username, req.body.fileName), 'w+'),
                lastByteUpload: 0,
                currentByteUpload: 0
            };
            _transactions[transactionId] = transaction;
        }
        transaction = _transactions[transactionId];

        let written = fs.writeSync(transaction.targetFile, req.body.fileData, undefined, 'base64');
        transaction.lastByteUpload = transaction.currentByteUpload;
        transaction.currentByteUpload = transaction.lastByteUpload + written;

        if (req.body.fileEnd) {
            console.log('close');
            fs.closeSync(transaction.targetFile);
            delete _transactions[transactionId];
            let file = {};
            file.path = path.join(BASEPATH, username, transaction.fileName);
            file.name = req.body.folderName ? req.body.folderName : transaction.fileName;
            utils.unZipFile(file, username, function (err, result) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(result);
                }
            });
        }
        res.send({
            code: 200,
            reason: "success",
            transactionId: transactionId
        });
    }

});
module.exports = router;
