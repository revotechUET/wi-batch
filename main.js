var http = require('http');
var fs = require('fs');
var async = require('async');
const LOGIN_HOST = 'login.sflow.me';
const LOGIN_PORT = 80;
const LOGIN_API = "/login";
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

function getFamilyList(callback) {
    var host = 'dev.sflow.me';
    var port = 80;
    var path = '/family/list';
    requestPost(host, port, path, {token:__TOKEN}, callback);
}


// Do login

async.series([ function(cb) {
    requestPost(LOGIN_HOST, LOGIN_PORT, LOGIN_API, {
        username: 'tunghx',
        password: '123456'
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
}, function(cb) {
    var host = 'dev.sflow.me';
    var port = 80;
    var path = '/family/list';
    requestPost(host, port, path, {token:__TOKEN}, function(res) {
        cb(null, res);
    });
}], function(error, result) {
    if (error) {
        console.error("Error:");
        console.error(error);
    }
    console.log("Success");
    console.log(result);
})
/*
console.log("Do login");
requestPost(LOGIN_HOST, LOGIN_PORT, LOGIN_API, {
    username: 'tunghx',
    password: '123456'
}, function(res) {
    console.log(res);
    var resObj = JSON.parse(res);
    if (!resObj || !resObj.content || !resObj.content.token) {
        console.error(res);
        return;
    }
    saveToken("token.txt", resObj.content.token);
    getFamilyList(function(res) {
        console.log(res);
    });
});
*/
