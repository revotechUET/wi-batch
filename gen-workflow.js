var Path = require('path');
var fs = require('fs');
var folder = 'sample';
var workflowDir = "workflow";
var readdir = require('readdir-enhanced');

if (process.argv.length < 4) {
    console.log('node gen-workflow.js [well-data-dir] [workflow-name]');
    process.exit(-1);
}


if (process.argv.length >= 3)
    folder = process.argv[2];
if (process.argv.length >= 4)
    workflowDir = process.argv[3];


if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, 0744);
}
else {
    console.error('Workflow exists');
    process.exit(-1);
}

var wfFile = Path.join(workflowDir, "workflow.json");

fs.writeFileSync(wfFile, JSON.stringify({
    host: "13.250.1.60",
    port: 80,
    path: "/upload/lases",
    username: "thuy",
    password: "1"
}, null, 4));

var allStream = fs.createWriteStream(Path.join(workflowDir, "all.txt"));

readdir.stream(folder).on('data', function(f) { }).on('file', function(path) {
    if (/.LAS$/i.test(path))
        allStream.write(Path.join(folder, path) + '\n');
}).on('end', function() {
    console.log('readdir ends');
    allStream.end(null, null, function() {
        console.log('stream write ends');
    });
});

/*readdir(folder).on('readable', function() {
    var entry = this.read();
    if (!entry) return;
    console.log(entry);
});*/
