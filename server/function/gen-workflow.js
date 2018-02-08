'use strict';
let Path = require('path');
let fs = require('fs');
let readdir = require('readdir-enhanced');

module.exports = function genWorkflow(config, name, folderName, callback, username) {
    let workflowDir = Path.join(__dirname, '../../', 'workflows', username, name);
    let folder = Path.join(__dirname, '../../', 'datadir', username, folderName);
    if (!fs.existsSync(folder)) {
        return callback("Data directory is not existed!", null);
    }
    if (!fs.existsSync(workflowDir)) {
        console.log("Create workflow dir ", workflowDir);
        fs.mkdirSync(workflowDir);
    } else {
        console.error("Batch job existed!");
        return callback("Batch job existed!", null);
    }
    let wfFile = Path.join(workflowDir, "workflow.json");
    fs.writeFileSync(wfFile, JSON.stringify(config, null, 4));
    let allStream = fs.createWriteStream(Path.join(workflowDir, "all.txt"));
    readdir.stream(folder, {deep: true}).on('data', function (f) {
    }).on('file', function (path) {
        if (/.LAS$/i.test(path))
            allStream.write(Path.join(folder, path) + '\n');
    }).on('end', function () {
        allStream.end(null, null, function () {
            callback(null, Path.join(workflowDir, "all.txt"));
        });
    }).on('error', function (err) {
        callback(err, null);
    });
}
