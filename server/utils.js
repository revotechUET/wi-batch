'use strict';
let fs = require('fs');
let path = require('path');
let extract = require('extract-zip');
let model = require('./model');
const replace = require('replace-in-file');

function deleteFolder(path) {
    let files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function (file, index) {
            let curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolder(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

function unZipFile(file, username, callback) {
    extract(file.path, {
        dir: path.join(__dirname, '../', 'datadir', username, file.name)
    }, function (err, result) {
        if (err) {
            fs.unlinkSync(file.path);
            fs.rmdirSync(path.join(__dirname, '../', 'datadir', username, file.name));
            callback(err, null);
        } else {
            fs.unlinkSync(file.path);
            callback(null, "Extract Done");
        }
    });
}

let createUser = function (payload) {
    return model.User.findOrCreate({
        where: {username: payload.username},
        defaults: {username: payload.username}
    });
};

let toUpCaseFile = function (file, callback) {
    const options = {
        files: file.path,
        from: /[A-Za-z-]+/g,
        to: (match) => match.toUpperCase(),
    };
    replace(options)
        .then(changes => {
            // console.log('Modified files:', changes.join(', '));
            callback(null, file);
        })
        .catch(error => {
            console.error('Error occurred:', error);
            callback(err, null);
        });
};

module.exports = {
    deleteFolder: deleteFolder,
    unZipFile: unZipFile,
    createUser: createUser,
    toUpCaseFile: toUpCaseFile
};
