const config = require("./config");
const google = require("googleapis");
const fs = require("fs");
const app = require('express')();
const http = require("http").createServer(app);
const socketio = require("socket.io").listen(http);

const youtube = google.youtube({
    version: "v3",
    auth: config.auth
});
getLive();
function getLive() {
    youtube.search.list({
        part: "snippet",
        channelId: config.channelId,
        eventType: "live",
        type: "video"
    }, (err, data) => {
        if (data.items.length < 1) return;
        const live = data.items[0];
        const id = live.id.videoId;
        const title = live.snippet.title;
        console.log(`配信を検出: [${title}]{${id}}`);
        getLiveChatId(id);
    })
}
function getLiveChatId(videoId) {
    youtube.videos.list({
        part: "liveStreamingDetails",
        id: videoId
    }, (err, data) => {
        if (err) console.error(err);
        if (data) {
            const liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId
            console.log(`ライブチャットを検出: {${liveChatId}}`);
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
                if (messages.length > 0) {
                    const timer = setInterval(() => {
                        if (messages.length < 1) {
                            clearInterval(timer);
                            request();
                        }
                        sendToChatRenderer([messages.shift()]);
                    }, data.pollingIntervalMillis / messages.length);
                }
            }
        })
    }
    request();
}

//comment renderer
const rendererSockets = {};
http.listen(config.port);
app.get("/up", (req, res) => {
    res.writeHead(200);
    res.end();
})
app.get("/renderer", (req, res) => {
    res.sendFile(__dirname + "/chat-renderer.html");
});
app.get("/renderer-wrapper", (req, res) => {
    res.sendFile(__dirname + "/chat-renderer-wrapper.html");
});
socketio.on("connection", (socket) => {
    rendererSockets[socket.id] = socket;
    socket.on("disconnect", () => {
        delete rendererSockets[socket.id];
    })
});
function sendToChatRenderer(data) {
    Object.keys(rendererSockets).forEach((key) => {
        rendererSockets[key].emit("data", data);
    });
}
