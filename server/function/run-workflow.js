'use strict';
let request = require('request');
let fs = require('fs');
let byline = require('byline');
let Path = require('path');
let async = require('async');
let path = require('path');

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
    let errorStream = fs.createWriteStream(Path.join(workflowDir, 'error.txt'), {'flags': 'a'});
    let doneStream = fs.createWriteStream(Path.join(workflowDir, 'done.txt'), {'flags': 'a'});
    let currentTime = new Date().toLocaleString('en-US', {timeZone: "Asia/Ho_Chi_Minh"});
    doneStream.write("<<================== " + currentTime + " ==================\n");
    errorStream.write("<<================== " + currentTime + " ==================\n");
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
        doneStream.write("================== End ==================>>\n\n\n");
        errorStream.write("================== End ==================>>\n\n\n");
        errorStream.end();
        doneStream.end(null, null, function () {
            // fs.renameSync(Path.join(workflowDir, 'done.txt'), Path.join(workflowDir, 'all.txt'));
            cb();
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
            let content = path.basename(res.path) + " - " + (res.success > 0 ? "Success" : "Failure");
            if (socket) socket.emit("run-workflow-file-result", {ts: Date.now(), content: content});
            doneStream.write(res.path + "||" + res.success + "\n");
            if (res.success === 0) {
                errorStream.write(res.path + "||" + res.error + "\n");
            }
        });
    });
}

module.exports = {
    uploadMultiFiles: uploadMultiFiles
}
