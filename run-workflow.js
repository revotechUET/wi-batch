var http = require('http');
var Path = require('path');
var fs = require('fs');
var byline = require('byline');
var request = require('request');
var async = require('async');
const LOGIN_HOST = 'login.sflow.me';
const LOGIN_PORT = 80;
const LOGIN_API = "/login";
function uploadFile (filePath, host, port, path, headers, callback) {
    console.log('uploadFile:' + filePath);
    var options = {
        method: "POST",
        url: 'http://' + host + ":" + port + path,
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
    }
    console.log("Send request for " + filePath);
    request(options, function (error, response, body) {
        if (error) callback(error);
        else callback(body);
    });
}
function requestPost(host, port, path, options, callback) {
    var _path = path;
    var creq = http.request({
        host: host,
        port: port,
        path: _path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }, function(res) {
        res.setEncoding('utf8');
        var output = "";
        res.on('data', function(chunk) {
            output += chunk;
        })
        .on('end', function() {
            callback(output);
        });
    });
    creq.write(JSON.stringify(options));
    creq.end();
}
var __TOKEN = null;

if (process.argv.length < 3) {
    console.log("node run-workflow.js [wflowFile]");
    process.exit(-1);
}
// workflow config
var workflowDir = 'workflow';
if (process.argv.length >= 3) 
    workflowDir = process.argv[2];

var workflowConfigFile = Path.join(workflowDir, "workflow.json");

var workflowConfig;
try {
    workflowConfig = JSON.parse(fs.readFileSync(workflowConfigFile));
}
catch(err) {
    console.error(err);
    process.exit(-1);
}

console.log(workflowConfigFile);
console.log(workflowConfig.username, workflowConfig.password);
function doLogin(cb) {
    requestPost(LOGIN_HOST, LOGIN_PORT, LOGIN_API, {
        username: workflowConfig.username,
        password: workflowConfig.password
    }, function(res) {
        var resObj = JSON.parse(res);
        if (!resObj || !resObj.content || !resObj.content.token) {
            console.error('Login error');
            cb(res);
        }
        else {
            __TOKEN = resObj.content.token;
            cb();
        }
    });
}
function uploadMultiFiles(cb) {
    var errorStream = fs.createWriteStream(Path.join(workflowDir, 'error.txt'));
    var doneStream = fs.createWriteStream(Path.join(workflowDir, 'done.txt'));

    var queue = async.queue(function(task, callback) {
        if (task.success || !task.path || !task.path.length) {
            async.setImmediate(function() {
                callback({
                    path: task.path,
                    success: 1
                });
            });
        }
        else {
            uploadFile(task.path, 
                workflowConfig.host, 
                workflowConfig.port, 
                workflowConfig.path, {
                    'Cache-Control': 'no-cache',
                    'x-access-token': __TOKEN,
                    'content-type': 'multipart/form-data'
                }, function (res) {
                    var resObj = null;
                    try {
                        resObj = JSON.parse(res);
                    }
                    catch (err) {
                        console.log("error:", err);
                        callback({
                            path:task.path,
                            success: 0,
                            error: res
                        });
                        return;
                    }

                    if (resObj.code && resObj.code == 200) {
                        callback({
                            path:task.path,
                            success: 1
                        });
                    }
                    else {
                        callback({
                            path:task.path,
                            success: 0,
                            error: JSON.stringify(resObj.content)
                        });
                    }
                }
            );
        }
    }, 3);

    queue.drain = function() {
        console.log('All item has been processed');
        errorStream.end();
        doneStream.end(null, null, function() {
            fs.renameSync(Path.join(workflowDir, 'done.txt'), Path.join(workflowDir, 'all.txt'));
        });
    }

    var allStream = fs.createReadStream(Path.join(workflowDir, 'all.txt'));
    allStream = byline.createStream(allStream);
    allStream.on('data', function(line) {
        var tokens = line.toString('utf8').split("||");
        queue.push({
            path:tokens[0], 
            success: (tokens.length > 1)?parseInt(tokens[1]):0
        }, function(res) {
            console.log(res);
            doneStream.write(res.path + "||" + res.success + "\n");
            if (res.success === 0) {
                errorStream.write(res.path + "||" + res.error + "\n");
            }
        });
    });
}
// RUN workflow
async.series([
    doLogin, 
    uploadMultiFiles
], function(error, result) {
    if (error) {
        console.error("Error:");
        console.error(error);
    }
    console.log("Success");
    fs.writeFileSync(workflowConfigFile, JSON.stringify(workflowConfig, null, 2));
});
