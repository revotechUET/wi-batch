'use strict';
let express = require('express');
let uuidv5 = require('uuid/v5');
let router = express.Router();
let fs = require('fs');
let path = require('path');
let utils = require('./utils');
let configApp = require('config').app;
let async = require('async');
let controller = require('./controller');

let _transactions = new Object();

let BASEPATH = path.join(__dirname, '../', 'uploads');

const NAMESPACE = '5b671a64-80d5-491e-9ab0-da01ff8f3341';
router.use(express.json({limit: "5mb"}));

router.get('/chunked-upload', function (req, res) {
    res.send("Hello world " + JSON.stringify(req.decoded));
});

function checkMaxWorkspace(username) {
    return new Promise(function (resolve) {
        let maxWorkspace = configApp.USER_MAX_DATADIR;
        let userWorkspaces = 1;
        try {
            fs.readdirSync(path.join(__dirname, '../', 'datadir', username)).forEach(() => {
                userWorkspaces++;
            });
        } catch (err) {
            return resolve(true);
        }
        if (userWorkspaces > maxWorkspace) {
            resolve(false);
        } else {
            resolve(true);
        }
    });
}

function checkFileType(fileName) {
    return new Promise(function (resolve) {
        let fileType = fileName.substring(fileName.lastIndexOf('.'));
        if (fileType != '.zip') {
            resolve(false);
        } else {
            resolve(true);
        }
    });
}

function checkFileExisted(username, fileName) {
    return new Promise(function (resolve) {
        let isExisted = false;
        if (!fs.existsSync(path.join(__dirname, '../', 'datadir', username))) {
            return resolve(isExisted);
        }
        try {
            for (let file of fs.readdirSync(path.join(__dirname, '../', 'datadir', username))) {
                if (file === fileName.substring(0, fileName.length - 4)) {
                    isExisted = true;
                    break;
                }
            }
        } catch (err) {
            return resolve(true);
        }
        resolve(isExisted);
    });
}
router.post('/chunked-upload', processChunkedUpload);
function processChunkedUpload(req, res) {
    let username = req.decoded.username;
    if (!fs.existsSync(path.join(BASEPATH, username))) {
        fs.mkdirSync(path.join(BASEPATH, username));
    }
    let transactionId = req.body.transactionId;
    let transaction;

    async.parallel([function(done) {
        if (!transactionId) {
            checkFileType(req.body.fileName).then(function(ret) {
                if (ret) done();
                else done('Not a zip file');
            });
        }
        else async.setImmediate(done);
    }, function(done) {
        if (!transactionId) {
            checkMaxWorkspace(username).then(function(ret) {
                if (ret) done();
                else done('Exceed number of zip archives');
            });
        }
        else async.setImmediate(done);
    }, function(done) {
        if (!transactionId) {
            checkFileExisted(username, req.body.fileName).then(function(isExisted) {
                if (isExisted) done('Archive  existed');
                else done();
            });
        }
        else async.setImmediate(done);
    }], function(err, results) {
        if (err) {
            return res.status(500).send({
                code: 512,
                reason: err,
                transactionId: ""
            })
        }
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
            file.name = req.body.folderName || transaction.fileName.substring(0, transaction.fileName.length - 4);
            utils.unZipFile(file, username, function (err, result) {
                if (err) {
                    console.log(err);
                    res.status(512).send({
                        code: 512,
                        reason: err.message,
                        transactionId: transactionId
                    });
                } else {
                    //console.log(result);
                    controller.generateNewWorkflow({
                        workflowName: file.name,
                        dataDir: file.name,
                        host: configApp.oInvHost,
                        port: configApp.oInvPort || 80,
                        path: "/upload/lases"
                    }, function() {
                        res.send({
                            code: 200,
                            reason: "success",
                            transactionId: transactionId
                        });
                    }, username);
                }
            });
        } else {
            res.send({
                code: 200,
                reason: "success",
                transactionId: transactionId
            });
        }
    });
}
function finalizeUpload() {
}
/*
router.post('/chunked-upload', async function (req, res) {
    let username = req.decoded.username;
    if (!fs.existsSync(path.join(BASEPATH, username))) {
        fs.mkdirSync(path.join(BASEPATH, username));
    }
    let transactionId = req.body.transactionId;
    let transaction;

    if (!transactionId) {
        let passMaxWorkspace = await checkMaxWorkspace(username);
        let passFileType = await checkFileType(req.body.fileName);
        let isExisted = await checkFileExisted(username, req.body.fileName);
        if (!passMaxWorkspace) {
            return res.status(500).send({
                code: 512,
                reason: "You got max data directory",
                transactionId: ""
            });
        }
        if (!passFileType) {
            return res.status(500).send({
                code: 512,
                reason: "Not a zip file",
                transactionId: ""
            });
        }
        if (isExisted) {
            return res.status(500).send({
                code: 512,
                reason: "Data dir existed",
                transactionId: ""
            });
        }
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
                res.status(512).send({
                    code: 512,
                    reason: err.message,
                    transactionId: transactionId
                });
            } else {
                console.log(result);
                res.send({
                    code: 200,
                    reason: "success",
                    transactionId: transactionId
                });
            }
        });
    } else {
        res.send({
            code: 200,
            reason: "success",
            transactionId: transactionId
        });
    }
});
*/
module.exports = router;
