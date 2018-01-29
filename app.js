'use strict';
let express = require('express');
let app = express();
let config = require('config');
let controller = require('./server/controller');
let bodyParser = require('body-parser');
let http = require('http').Server(app);
let io = require('socket.io')(http);
let cors = require('cors');
let jwt = require('jsonwebtoken');
app.use(cors());
app.use(express.static("client"));
app.use(bodyParser.urlencoded({extended: false}));

let authenticate = require('./server/authenticate');

app.use(authenticate());

app.use('/', require('./server/chunked-upload'));

io.on('connection', function (socket) {
    console.log("A client connected");
    socket.on('disconnect', function () {
        console.log("Client out");
    });
    socket.on('run-workflow', function (data) {
        console.log("Client call");
        let username;
        let token = data.token;
        if (token) {
            jwt.verify(token, config.app.jwtSecretKey, function (err, decoded) {
                if (err) {
                    socket.emit('run-workflow-file-result', {rs: Date.now(), content: err});
                } else {
                    username = decoded.username;
                    data.socket = socket;
                    controller.runAWorkflow(data, function (response) {
                        // console.log("Emit all done ", response);
                        socket.emit('run-workflow-done', {ts: Date.now(), content: response.reason});
                    }, username, token);
                }
            });
        } else {
            socket.emit('run-workflow-file-result', {ts: Date.now(), content: "No token provided"});
        }
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
    controller.generateNewWorkflow(data, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.post('/workflow/generate', function (req, res) {
    controller.generateNewWorkflow(req.body, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);

});

app.get('/workflow/run', function (req, res) {
    let data = {};
    data.workflowName = req.query.workflowName;
    controller.runAWorkflow(data, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.post('/workflow/run', function (req, res) {
    let data = {};
    data.workflowName = req.body.workflowName;
    controller.runAWorkflow(data, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.get('/workflow/list', function (req, res) {
    controller.listWorkflow(req, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.post('/workflow/list', function (req, res) {
    controller.listWorkflow(req, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.post('/workflow/delete', function (req, res) {
    controller.deleteWorkflow(req.body, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.get('/workflow/delete', function (req, res) {
    controller.deleteWorkflow(req.query, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.post('/workflow/data-list', function (req, res) {
    controller.listDataDir(req.body, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.get('/workflow/data-list', function (req, res) {
    controller.listDataDir(req.query, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.post('/workflow/delete-data', function (req, res) {
    controller.deleteDataDir(req.body, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.get('/workflow/delete-data', function (req, res) {
    controller.deleteDataDir(req.query, function (done) {
        res.send(done);
    }, req.decoded.username);
});

http.listen(config.app.port, (err) => {
    if (!err) console.log('Server is listening on', config.app.port);
});
