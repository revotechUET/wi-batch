let fs = require('fs');
let path = require('path');
let extract = require('extract-zip');

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
    extract(file.path, {dir: path.join(__dirname, '../', 'datadir', username, file.name)}, function (err) {
        if (err) {
            fs.rmdirSync(path.join(__dirname, '../', 'datadir', username, file.name));
            callback(err, null);
        } else {
            callback(null, "Extract Done");
        }
    })
}

module.exports = {
    deleteFolder: deleteFolder,
    unZipFile: unZipFile
};