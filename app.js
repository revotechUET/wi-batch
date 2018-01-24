let express = require('express');
let app = express();
let config = require('config');
let controller = require('./server/controller');
let bodyParser = require('body-parser');
let http = require('http').Server(app);
let io = require('socket.io')(http);

app.use(express.static("client"));
app.use(bodyParser.urlencoded({extended: false}));

let authenticate = require('./server/authenticate');

app.use(authenticate());

app.use('/', require('./server/chunked-upload'));


io.on('connection', function (socket) {
    console.log("A client connected");
    let username = "hoang";
    socket.on('disconnect', function () {
        console.log("Client out");
    });
    socket.on('run-work-flow', function (workflowName) {
        let data = {};
        data.workflowName = workflowName;
        data.socket = socket;
        controller.runAWorkflow(data, function () {

        }, username);
    });
});

app.get('/', function (req, res) {
    let path = require('path');
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});


app.get('/workflow/generate', function (req, res) {
    let data = {};
    data.workflowName = req.query.workflowName;
    data.dataDir = req.query.dataDir;
    data.username = req.query.username;
    data.password = req.query.password;
    controller.generateNewWorkflow(data, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.post('/workflow/generate', function (req, res) {
    controller.generateNewWorkflow(req.body, function (done) {
        res.send(done);
    }, req.decoded.username);

});

app.get('/workflow/run', function (req, res) {
    let data = {};
    data.workflowName = req.query.workflowName;
    controller.runAWorkflow(data, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.post('/workflow/run', function (req, res) {
    let data = {};
    data.workflowName = req.body.workflowName;
    controller.runAWorkflow(data, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.get('/workflow/list', function (req, res) {
    controller.listWorkflow(req, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.post('/workflow/list', function (req, res) {
    controller.listWorkflow(req, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.post('/workflow/delete', function (req, res) {
    controller.deleteWorkflow(req.body, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.get('/workflow/delete', function (req, res) {
    controller.deleteWorkflow(req.query, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.post('/workflow/data-list', function (req, res) {
    controller.listDataDir(req.body, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.get('/workflow/data-list', function (req, res) {
    controller.listDataDir(req.query, function (done) {
        res.send(done);
    }, req.decoded.username);
});

http.listen(config.app.port, (err) => {
    if (!err) console.log('Server is listening on', config.app.port);
});