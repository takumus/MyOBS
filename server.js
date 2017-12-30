const google = require("googleapis");
const fs = require("fs");
const http = require("http");
const socketio = require("socket.io");

const videoId = process.argv[2];
const youtube = google.youtube({
    version: "v3",
    auth: "AIzaSyBVjBaD-aIVPugo_IlkKE2x2KmkfoJIEi4"
});
getLiveChatId(videoId);
function getLiveChatId(videoId) {
    youtube.videos.list({
        part: "liveStreamingDetails",
        id: videoId
    }, (err, data) => {
        if (err) console.error(err);
        if (data) {
            const liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId
            startPolling(liveChatId);
        }
    })
}
function startPolling(liveChatId) {
    let nextPageToken = null;
    function request() {
        youtube.liveChatMessages.list({
            part: "snippet,authorDetails",
            liveChatId: liveChatId,
            profileImageSize: 88,
            pageToken: nextPageToken
        }, (err, data) => {
            if (err) {
                console.error("Error: " + err);
                setTimeout(request, 3000)
            }
            if (data) {
                nextPageToken = data.nextPageToken
                const messages = data.items.map((item) => {
                    return {
                        id: item.id,
                        author: {
                            name: item.authorDetails.displayName,
                            icon: item.authorDetails.profileImageUrl
                        },
                        message: item.snippet.displayMessage
                    }
                });
                console.log(messages);
                if (messages.length > 0) {
                    sendToChatRenderer(messages)
                }
                setTimeout(request, Number(data.pollingIntervalMillis))
            }
        })
    }
    request();
}

//comment renderer
let chatRendererSocket = null;
const chatRendererServer = http.createServer((req, res) => {
    res.writeHead(200, {"Content-Type" : "text/html"});
    res.end(fs.readFileSync(__dirname + "/chat-renderer.html", "utf-8"));
}).listen(3001);
socketio.listen(chatRendererServer).sockets.on("connection", function(socket) {
    chatRendererSocket = socket;
});
function sendToChatRenderer(data) {
    if (chatRendererSocket) chatRendererSocket.emit("data", data);
}
