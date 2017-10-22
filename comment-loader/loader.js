(function() {
    function getComments() {
        var commentElems = document.querySelectorAll("yt-live-chat-text-message-renderer");
        var comments = [];
        commentElems.forEach(function(e) {
            var id = e.id;
            var icon = e.querySelector("#img").src;
            var author = e.querySelector("#author-name").innerText;
            var message = e.querySelector("#message").innerText;
            if (icon == "") return;
            var comment = {
                id: id,
                icon: icon,
                author: author,
                message: message
            }
            comments.push(comment);
            e.remove();
        });
        if (comments.length > 0) send(comments);
    }
    function send(data) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://localhost:3000/', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send("data=" + JSON.stringify(data));
    }
    setInterval(getComments, 200);
})();