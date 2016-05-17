document.addEventListener("DOMContentLoaded", function () {
    // use all vendor prefixed versions of getUserMedia
    window.navigator.getUserMedia = window.navigator.getUserMedia || window.navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia || window.navigator.msGetUserMedia;

    // get all the important dom elements
    var $myId = document.querySelector('#my-id');
    var $state = document.querySelector('#state');
    var $connectButton = document.querySelector('#connect-button');
    var $sendButton = document.querySelector('#send-button');
    var $searchInput = document.querySelector('#search-input');
    var $chatInput = document.querySelector('#chat-input');
    var $messages = document.querySelector('#messages');
    var $disconnectedContainer = document.querySelector('#disconnected-container');
    var $connectedContainer = document.querySelector('#connected-container');

    var $localVideo = document.querySelector('#local-video');
    var $remoteVideo = document.querySelector('#remote-video');

    var $controlEnd = document.querySelector('#control-end');
    var $controlMute = document.querySelector('#control-mute');
    var $controlPause = document.querySelector('#control-pause');

    // setup messages array. this stores all messages sent during this session
    var messages = [];

    // generate random id to identify
    var uuid = Math.random().toString(36).substr(2, 7);
    var remoteUuid = null;
    var connection;
    var stream;

    $myId.innerText = 'My id: ' + uuid;

    // initialize peer.js by telling it where the signaling server is located
    var peer = new Peer(uuid, {
        host: 'hue.visitlead.com',
        debug: 1,
        secure: true,
        port: 443
    });

    peer.on('open', function (id) {
        console.log('Peer open! My id is:', id);
        $state.innerText = 'Ready';
    });
    peer.on('close', function () {
        $state.innerText = 'Peer closed!';
        $disconnectedContainer.style.display = 'block';
        $connectedContainer.style.display = 'none';
    });
    peer.on('disconnected', function () {
        $state.innerText = 'Peer disconnected!';
        $disconnectedContainer.style.display = 'block';
        $connectedContainer.style.display = 'none';
    });
    peer.on('error', function (err) {
        $state.innerText = 'Peer error! ' + err.message;
        $disconnectedContainer.style.display = 'block';
        $connectedContainer.style.display = 'none';
    });
    peer.on('connection', function (dataConnection) {
        console.log('connection!', dataConnection);
        remoteUuid = dataConnection.peer;
        setConnection(dataConnection);
    });

    peer.on('call', function(call) {
        console.log("call!");
        // Answer the call, providing our mediaStream
        getUserMedia(function (stream) {
            $localVideo.src = window.URL.createObjectURL(stream);
            call.answer(stream);

            call.on('stream', function(stream) {
                $remoteVideo.src = window.URL.createObjectURL(stream);
            });
        }, function(err){
            console.log("Get usermedia error", err);
        })
    });

    function setConnection(dataConnection) {
        if (connection) {
            // only allow one active connection, otherwise more logic is required
            connection.close();
        }
        connection = dataConnection;
        dataConnection.on('data', function (data) {
            console.log('Got data:', data);
            if (data.type === 'message') {
                messages.push({text: data.data, sender: 'User'});
                updateMessageList();
            }

            if(data.type === 'control'){
                switch(data.data){
                    case 'mute':
                        $remoteVideo.muted = !$remoteVideo.muted;
                        break;
                    case 'pause':
                        console.log('paused?', $remoteVideo.paused);
                        if($remoteVideo.paused){
                            $remoteVideo.play();
                        } else {
                            $remoteVideo.pause();
                        }
                        break;
                }
            }
        });
        dataConnection.on('open', function () {
            console.log('DataConnection open!');
            $state.innerText = 'Connected to ' + remoteUuid;
            $disconnectedContainer.style.display = 'none';
            $connectedContainer.style.display = 'block';
            sendMessage('hi there');
        });
        dataConnection.on('close', function () {
            $state.innerText = 'DataConnection closed!';
            $disconnectedContainer.style.display = 'block';
            $connectedContainer.style.display = 'none';
        });
        dataConnection.on('error', function (err) {
            $state.innerText = 'DataConnection error! ' + err.message;
            $disconnectedContainer.style.display = 'block';
            $connectedContainer.style.display = 'none';
        });
    }

    function sendMessage(text) {
        if (connection) {
            messages.push({text: text, sender: 'Me'});
            connection.send({type: 'message', data: text});
            updateMessageList();
        }
    }

    function updateMessageList() {
        $messages.innerHTML = '';
        var li;
        messages.forEach(function (message) {
            li = document.createElement('li');
            li.innerText = message.sender + ': ' + message.text;
            $messages.appendChild(li);
        });
    }

    function getUserMedia(callback){
        if(stream){
            callback(stream);
        } else {
            navigator.getUserMedia({
                video: true,
                audio: true
            }, function (_stream) {
                stream = _stream;
                callback(stream);
            }, function(err){
                console.log("Get usermedia error", err);
            })
        }
    }

    $connectButton.addEventListener('click', function () {
        remoteUuid = $searchInput.value;
        setConnection(peer.connect($searchInput.value));

        getUserMedia(function (stream) {
            $localVideo.src = window.URL.createObjectURL(stream);
            var call = peer.call(remoteUuid, stream);
            call.on('stream', function(stream) {
                $remoteVideo.src = window.URL.createObjectURL(stream);
            });
        }, function(err){
            console.log("Get usermedia error", err);
        })
    });

    $sendButton.addEventListener('click', function () {
        sendMessage($chatInput.value);
        $chatInput.value = '';
    });


    $controlEnd.addEventListener('click', function(){
        if(connection){
            connection.close();
        }
    });


    $controlMute.addEventListener('click', function(){
        if (connection) {
            connection.send({type: 'control', data: 'mute'});
        }
    });


    $controlPause.addEventListener('click', function(){
        if (connection) {
            connection.send({type: 'control', data: 'pause'});
        }
    });
});