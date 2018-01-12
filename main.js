var http = require('http');
var fs = require('fs');
var request = require('request');
var async = require('async');
const LOGIN_HOST = 'login.sflow.me';
const LOGIN_PORT = 80;
const LOGIN_API = "/login";
function uploadFile (filePath, host, port, path, headers, callback) {
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
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        callback(body);
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
function saveToken(fileName, token) {
    fs.writeFileSync(fileName, token);
    __TOKEN = token;
}

// workflow config
var workflowConfig = {
    username: 'thuy',
    password: '1',
    files: [
        "./sample/4.las",
        "./sample/5.las",
        "./sample/6.las"
    ],
    file: "./sample/4.las"
};
function doLogin(cb) {
    requestPost(LOGIN_HOST, LOGIN_PORT, LOGIN_API, {
        username: workflowConfig.username,
        password: workflowConfig.password
    }, function(res) {
        var resObj = JSON.parse(res);
        if (!resObj || !resObj.content || !resObj.content.token) {
            cb(res);
        }
        else {
            __TOKEN = resObj.content.token;
            cb();
        }
    });
}
function uploadOneFile(cb) {
    var host = 'localhost';
    var port = 9000;
    var path = '/upload/lases';
    var filePath = workflowConfig.file;
    uploadFile(filePath, host, port, path, {
        'Cache-Control': 'no-cache',
        'x-access-token': __TOKEN,
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
    }, function (body) {
        console.log('body', body);
    });
}
function uploadMultiFile(cb) {
    var files = workflowConfig.files;
    async.eachSeries(files, uploadOneFile, function (err) {
        if(err) {
            console.log('A file failed to upload');
            cb(err);
        } else {
            console.log('All files have been uploaded successfully');
            cb();
        }
    })
}
// RUN workflow
async.series([
    doLogin, 
    uploadOneFile
    // uploadMultiFile
], function(error, result) {
    if (error) {
        console.error("Error:");
        console.error(error);
    }
    console.log("Success");
    console.log(result);
});
