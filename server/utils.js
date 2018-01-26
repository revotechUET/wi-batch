let fs = require('fs');
let unzip = require('unzip');
let path = require('path');

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
    let unzipStream = unzip.Extract({path: path.join(__dirname, '../', 'datadir', username, file.name)});
    unzipStream.on('error', function (err) {
        fs.unlinkSync(file.path);
        console.log('error', file.path);
        console.log('path', path.join(__dirname, '../', 'datadir', username, file.name));
        return callback(err, null);
    });
    unzipStream.on('close', function () {
        fs.unlinkSync(file.path);
        console.log('success', file.path);
        return callback(null, "Extract Done");
    });
    fs.createReadStream(file.path).pipe(unzipStream);
}

module.exports = {
    deleteFolder: deleteFolder,
    unZipFile: unZipFile
};