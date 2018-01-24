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
    try {
        fs.createReadStream(file.path).pipe(unzip.Extract({path: path.join(__dirname, '../', 'datadir', username, file.name)}));
        fs.unlinkSync(file.path);
        console.log(file.path);
        callback(null, "Extract Done");
    } catch (err) {
        callback(err, null);
    }
}

module.exports = {
    deleteFolder: deleteFolder,
    unZipFile: unZipFile
};