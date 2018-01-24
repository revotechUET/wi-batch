let request = require('request');
let fs = require('fs');
let byline = require('byline');
let Path = require('path');
let async = require('async');
let config = require('config');
let loginUrl = 'http://' + config.authenService.host + ':' + config.authenService.port + '/' + config.authenService.path;

function doLogin(username, password, callback) {
    let options = {
        method: 'POST',
        url: loginUrl,
        headers:
            {
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json'
            },
        body: {username: username, password: password},
        json: true
    };
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        if (body.content) {
            if (body.content.token) {
                callback(null, body.content.token);
            } else {
                callback(body.reason, null);
            }
        } else {
            callback("No content", null);
        }
    });
}

function uploadFile(filePath, uploadUrl, headers, callback) {
    console.log("==================================");
    console.log('uploadFile:' + filePath);
    let options = {
        method: "POST",
        url: uploadUrl,
        headers: headers,
        formData: {
            file: {
                value: fs.createReadStream(filePath),
                options: {
                    filename: filePath,
                    contentType: null
                }
            }
        }
    };
    console.log("Send request for " + filePath);
    request(options, function (error, response, body) {
        if (error) callback(error);
        else callback(body);
    });
}


function uploadMultiFiles(workflowConfig, cb) {
    let socket = workflowConfig.socket;
    let workflowDir = workflowConfig.workflowDir;
    let errorStream = fs.createWriteStream(Path.join(workflowDir, 'error.txt'));
    let doneStream = fs.createWriteStream(Path.join(workflowDir, 'done.txt'));
    let uploadUrl = "http://" + workflowConfig.host + ':' + workflowConfig.port + workflowConfig.path;
    let queue = async.queue(function (task, callback) {
        if (task.success || !task.path || !task.path.length) {
            async.setImmediate(function () {
                callback({
                    path: task.path,
                    success: 1
                });
            });
        }
        else {
            uploadFile(task.path,
                uploadUrl, {
                    'Cache-Control': 'no-cache',
                    'x-access-token': workflowConfig.token,
                    'content-type': 'multipart/form-data'
                }, function (res) {
                    let resObj = null;
                    try {
                        resObj = JSON.parse(res);
                    }
                    catch (err) {
                        console.log("error:", err);
                        callback({
                            path: task.path,
                            success: 0,
                            error: res
                        });
                        return;
                    }

                    if (resObj.code && resObj.code == 200) {
                        callback({
                            path: task.path,
                            success: 1
                        });
                    }
                    else {
                        callback({
                            path: task.path,
                            success: 0,
                            error: JSON.stringify(resObj.content)
                        });
                    }
                }
            );
        }
    }, 3);

    queue.drain = function () {
        console.log('All item has been processed');
        errorStream.end();
        doneStream.end(null, null, function () {
            fs.renameSync(Path.join(workflowDir, 'done.txt'), Path.join(workflowDir, 'all.txt'));
        });
    };

    let allStream = fs.createReadStream(Path.join(workflowDir, 'all.txt'));
    allStream = byline.createStream(allStream);
    allStream.on('data', function (line) {
        let tokens = line.toString('utf8').split("||");
        queue.push({
            path: tokens[0],
            success: (tokens.length > 1) ? parseInt(tokens[1]) : 0
        }, function (res) {
            // console.log(res);
            socket.emit("run-work-flow-result", res);
            doneStream.write(res.path + "||" + res.success + "\n");
            if (res.success === 0) {
                errorStream.write(res.path + "||" + res.error + "\n");
            }
        });
    });
}

module.exports = {
    doLogin: doLogin,
    uploadMultiFiles: uploadMultiFiles
}