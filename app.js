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
let path = require('path');

app.use(cors());
app.use(express.static("client"));
app.use(bodyParser.urlencoded({extended: false}));

let authenticate = require('./server/authenticate');

app.use('/log', express.static(path.join(__dirname, 'workflows')));

app.use(authenticate());

app.use('/', require('./server/chunked-upload'));

let runningWorkflow = {};

io.on('connection', function (socket) {
    console.log("A client connected");
    socket.on('disconnect', function () {
        console.log("Client out");
    });
    socket.on('run-workflow', function (data) {
        console.log("Client call run workflow");
        let username;
        let token = data.token;
        if (token) {
            jwt.verify(token, config.app.jwtSecretKey, function (err, decoded) {
                if (err) {
                    socket.emit('run-workflow-error', {
                        rs: Date.now(),
                        content: err
                    });
                } else {
                    username = decoded.username;
                    let room = username + data.workflowName;
                    socket.join(room);
                    if (runningWorkflow[room]) {
                        console.log("Running........");
                        io.to(room).emit('run-workflow-error', {
                            ts: Date.now(),
                            content: "Running..."
                        });
                    } else {
                        runningWorkflow[room] = socket;
                        let username;
                        let token = data.token;
                        username = decoded.username;
                        data.io = io;
                        data.room = room;
                        controller.runAWorkflow(data, function (response) {
                            console.log("Emit all done ", room);
                            io.to(room).emit('run-workflow-done', {
                                ts: Date.now(),
                                content: response.reason
                            });
                            delete runningWorkflow[room];
                        }, username, token);
                    }
                }
            });
        } else {
            socket.emit('run-workflow-file-result', {
                ts: Date.now(),
                content: "No token provided"
            });
        }
    });
});

app.get('/', function (req, res) {
    let path = require('path');
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});


app.post('/workflow/generate', function (req, res) {
    controller.generateNewWorkflow(req.body, function (done) {
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

app.post('/workflow/list', function (req, res) {
    controller.listWorkflow(req, function (done) {
        res.send(done);
    }, req.decoded.username, runningWorkflow);
});

app.post('/workflow/delete', function (req, res) {
    controller.deleteWorkflow(req.body, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});

app.post('/workflow/data-list', function (req, res) {
    controller.listDataDir(req.body, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});


app.post('/workflow/delete-data', function (req, res) {
    controller.deleteDataDir(req.body, function (done) {
        res.send(done);
    }, req.decoded.username);
});

app.post('/well/create-well', function (req, res) {
    controller.makeRequestToBackend(req.body, function (done) {
        res.send(done);
    }, req.decoded.username, req.token);
});


let wellHeaderUpload = require('./server/well-header/well-header-upload');
let wellHeaderRouter = require('./server/well-header/well-header');
let wellTopUpload = require('./server/well-top/well-top-upload');
let wellTopRouter = require('./server/well-top/well-top');
app.use('/well-header', wellHeaderUpload);
app.use('/well-header', wellHeaderRouter);
app.use('/well-top', wellTopUpload);
app.use('/well-top', wellTopRouter);


http.listen(config.app.port, (err) => {
    if (!err) console.log('Server is listening on', config.app.port);
});
