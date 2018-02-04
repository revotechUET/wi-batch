'use strict';
let genWorkflow = require('./function/gen-workflow');
let runWorkflow = require('./function/run-workflow');
let createNewWell = require('./function/create-new-well');
let fs = require('fs');
let path = require('path');
let utils = require('./utils');
let responseJSON = require('./response');
let asyncEach = require('async/each');
let model = require('./model');

let generateNewWorkflow = function (data, callback, username) {
    if (!fs.existsSync(path.join(__dirname, '../', 'workflows', username))) {
        fs.mkdirSync(path.join(__dirname, '../', 'workflows', username));
    }
    if (!data.workflowName) return callback(responseJSON(512, "NEED WORKFLOW NAME", {}));
    let myConfig = {
        host: data.host,
        port: data.port,
        path: data.path,
        dataDir: data.dataDir,
        ts: Date.now()
    }
    genWorkflow(myConfig, data.workflowName, data.dataDir, function (err, file) {
        if (err) {
            callback(responseJSON(400, err, {}));
        } else {
            let response = {};
            response.filesList = fs.readFileSync(file).toString().split("\n");
            response.info = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'workflows', username, data.workflowName, 'workflow.json')).toString());
            response.filesList.splice(response.filesList.length - 1, 1);
            callback(responseJSON(200, "Successfull", response));
        }
    }, username);
};

let runAWorkflow = function (data, callback, username, token) {
    let workflowName = data.workflowName;
    let workflowConfig = null;
    try {
        workflowConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'workflows', username, workflowName, 'workflow.json')).toString());
        workflowConfig.workflowDir = path.join(__dirname, '../', 'workflows', username, workflowName);
        workflowConfig.io = data.io;
        workflowConfig.room = data.room;
        workflowConfig.token = token;
    } catch (err) {
        return callback(responseJSON(512, "No Workflow found", {}));
    }
    runWorkflow.uploadMultiFiles(workflowConfig, function () {
        callback(responseJSON(200, "Successfull", workflowConfig));
    });
};

let listWorkflow = function (data, callback, username, runningWorkflow) {
    if (!fs.existsSync(path.join(__dirname, '../', 'workflows', username))) {
        fs.mkdirSync(path.join(__dirname, '../', 'workflows', username));
    }
    let workflwoFolder = path.join(__dirname, '../', 'workflows', username);
    let files = [];
    fs.readdirSync(workflwoFolder).forEach(file => {
        if (file != 'readme.txt') {
            let info = {};
            info.workflowName = file;
            info.workflowConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'workflows', username, file, 'workflow.json')).toString());
            files.push(info);
        }
    });
    asyncEach(files, function (workflow, next) {
        //new, processed, running
        if (!fs.existsSync(path.join(__dirname, '../', 'workflows', username, workflow.workflowName, 'done.txt'))) {
            workflow.status = "new";
            next();
        } else {
            if (runningWorkflow[username + workflow.workflowName]) {
                workflow.status = "running";
                next();
            } else {
                workflow.status = "processed";
                next();
            }
        }
    }, function (err) {
        callback(responseJSON(200, "Successfull", files));
    });
};

let listDataDir = function (data, callback, username) {
    if (!fs.existsSync(path.join(__dirname, '../', 'dataDir', username))) {
        fs.mkdirSync(path.join(__dirname, '../', 'dataDir', username));
    }
    let dataDirFolder = path.join(__dirname, '../', 'dataDir', username);
    let files = [];
    fs.readdirSync(dataDirFolder).forEach(file => {
        if (file != 'readme.txt') {
            files.push(file);
        }
    });
    callback(responseJSON(200, "Successfull", files));
}

let deleteWorkflow = function (payload, callback, username) {
    if (payload.workflowName) {
        let deletePath = path.join(__dirname, '../', 'workflows', username, payload.workflowName);
        utils.deleteFolder(deletePath);
        callback(responseJSON(200, "Successfull", payload.workflowName));
    } else {
        callback(responseJSON(500, "No workflow name", {}));
    }
};

let deleteDataDir = function (payload, callback, username) {
    let response = [];
    let dataDir = payload.dataDir;
    let dataPath = path.join(__dirname, '../', 'datadir', username, dataDir);
    utils.deleteFolder(dataPath);
    fs.readdirSync(path.join(__dirname, '../', 'workflows', username)).forEach(file => {
        console.log(file);
        let workflowConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'workflows', username, file, 'workflow.json')).toString());
        if (workflowConfig.dataDir === dataDir) {
            utils.deleteFolder(path.join(__dirname, '../', 'workflows', username, file));
            response.push(file);
        }
    });
    callback(responseJSON(200, "Successfull", response));
};

let makeRequestToBackend = function (payload, callback, username, token) {
    model.WellHeader.findAll({
        where: {
            username: username
        }
    }).then(wells => {
        createNewWell({projectName: payload.projectName, wells: wells}, token, function (err, success) {
            if (err) {
                callback(responseJSON(512, "Error", err));
            } else {
                callback(responseJSON(200, "Successfull", success));
            }
        }, username);
    }).catch(err => {
        callback(responseJSON(512, "Error", err));
    });
};

module.exports = {
    generateNewWorkflow: generateNewWorkflow,
    runAWorkflow: runAWorkflow,
    listWorkflow: listWorkflow,
    deleteWorkflow: deleteWorkflow,
    listDataDir: listDataDir,
    deleteDataDir: deleteDataDir,
    makeRequestToBackend: makeRequestToBackend
};
