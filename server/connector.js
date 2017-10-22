const express = require('express');
const bodyParser = require('body-parser');     
const https = require('https');
const fs = require('fs');
const http = require('http');
const socketio = require('socket.io');

const app = express();

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
const server = https.createServer({
    key:  fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.crt')
}, app);                                                                                    
app.post('/', (req, res) => {
    res.writeHead(200);
    res.end("");
    sendToCommentRenderer(JSON.parse(req.body.data));
});                                                                              
server.listen(3000);

//comment renderer
let commentRendererSocket = null;
const commentRendererServer = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.end(fs.readFileSync(__dirname + '/comment-renderer.html', 'utf-8'));
}).listen(3001);
socketio.listen(commentRendererServer).sockets.on('connection', function(socket) {
    commentRendererSocket = socket;
});
function sendToCommentRenderer(data) {
    if (commentRendererSocket) commentRendererSocket.emit("data", data);
}

//title renderer
let titleRendererSocket = null;
const titleRendererServer = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.end(fs.readFileSync(__dirname + '/title-renderer.html', 'utf-8'));
}).listen(3002);
socketio.listen(titleRendererServer).sockets.on('connection', function(socket) {
    titleRendererSocket = socket;
});
function sendToTitleRenderer(data) {
    if (titleRendererSocket) titleRendererSocket.emit("data", data);
}

//manager
let managerSocket = null;
const managerServer = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.end(fs.readFileSync(__dirname + '/manager.html', 'utf-8'));
}).listen(3003);
socketio.listen(managerServer).sockets.on('connection', function(socket) {
    managerSocket = socket;
    socket.on('data', (data) => {
        switch(data.type) {
            case 'title':
            sendToTitleRenderer(data);
            break;
        }
    })
});
function sendToManager(data) {
    if (managerSocket) managerSocket.emit("data", data);
}