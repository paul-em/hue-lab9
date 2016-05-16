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

    // setup messages array. this stores all messages sent during this session
    var messages = [];

    // generate random id to identify
    var uuid = Math.random().toString(36).substr(2, 7);
    var remoteUuid = null;
    var connection;

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
        $state.innerText = 'Peer error! ' +  err.message;
        $disconnectedContainer.style.display = 'block';
        $connectedContainer.style.display = 'none';
    });
    peer.on('connection', function (dataConnection) {
        console.log('connection!', dataConnection);
        remoteUuid = dataConnection.peer;
        setConnection(dataConnection);
    });

    function setConnection(dataConnection){
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

    $connectButton.addEventListener('click', function(){
        remoteUuid = $searchInput.value;
        setConnection(peer.connect($searchInput.value));
    });

    $sendButton.addEventListener('click', function(){
        sendMessage($chatInput.value);
        $chatInput.value = '';
    });



});