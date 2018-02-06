const config = require("./config");
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const https = require("https");
const fs = require("fs");
const socketio = require("socket.io");

const recorderApp = express();
const transcripterApp = express();

const recorderServer = https.createServer({
    key: fs.readFileSync("./server.key"),
    cert: fs.readFileSync("./server.crt"),
    passphrase: "0000"
}, recorderApp).listen(config.recorderPort, function(){
    console.log("server stating on " + config.recorderPort);
});
const rendererServer = http.createServer(transcripterApp).listen(config.rendererPort, function(){
    console.log( "server stating on " + config.rendererPort);
});
const socket = socketio.listen(rendererServer);

transcripterApp.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
transcripterApp.use(bodyParser.urlencoded({extended: true}));
transcripterApp.use(bodyParser.json());
recorderApp.get("/recorder", function(req, res){
    const body = fs.readFileSync("./www/recorder.html").toString().replace("${port}", config.rendererPort);
    res.status(200);
    res.end(body);
});
transcripterApp.post("/receiver", function(req, res){
    sendToRenderer(req.body);
    res.status(200);
    res.end();
});
transcripterApp.get("/up", function(req, res){
    res.status(200);
    res.end();
});
transcripterApp.get("/", function(req, res){
    res.sendFile(__dirname + "/www/renderer/wrapper.html");
});
transcripterApp.get("/renderer", function(req, res){
    res.sendFile(__dirname + "/www/renderer/renderer.html");
});

const rendererSockets = {};
function sendToRenderer(data) {
    console.log(decodeURI(data.value));
    Object.keys(rendererSockets).forEach((key) => {
        rendererSockets[key].emit("data", data);
    });
}
socket.on("connection", (socket) => {
    rendererSockets[socket.id] = socket;
    socket.on("disconnect", () => {
        delete rendererSockets[socket.id];
    });
});