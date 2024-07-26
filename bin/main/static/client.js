var conn = new WebSocket('ws://localhost:8080/socket');
                 // Initiate websocket connection to a signaling server
                 // created a new WebSocket object. The 'url' parameter specifies the URL to which the WebSocket will contact.
                 // 'ws://' -> specifies the WebSocket protocol
                 // 'wss://' -> to encrypt the communication with SSL(secure shel)/TLS(Transport Layer Security).
                 // 'http://' -> specifies the HTTP protocol.
                 // localhost -> Refers to the local machine where the WebSocket server is running
                 // '/socket' -> Represents the endpoint on the WebSocket server to which the client('conn' in this case) will connect. This endpoint is where the WebSocket server will handle WebSocket connections and communication.
                 // var conn -> This initialized a new WebSocket object and assigns it to the variable 'conn'. the 'conn' variable now represents the WebSocket connection instance through which you can send and receive data.
                 // After establishing the WebSocket connection('conn'), you typically set up event listeners('onopen', 'onmessage', 'onclose', 'onerror') to handle different aspects of the WebSocket communication
                 // Messages send and receive over WebSocket connections are typically handled as strings or binary data('Blob' or 'ArrayBuffer').

var peerConnection;
var dataChannel;
var chunkSize = 16384; // Size of each chunk to send (16KB)
var receivedBuffers = [];
var fileInput = document.getElementById('fileInput');
//var fileName = "";

conn.onmessage = function(msg) {  // 'conn.onmessage' -> This sets up an event handler for the WebSocket 'conn'  to execute when a message ('msg') is received from the server
                                  // 'conn.onmessage' -> event handler is called whenever a message is received form the signaling server over the websocket connection. This allows the client to process incoming messages.
    var content = JSON.parse(msg.data); // Parses the received message('msg.data') from JSON format into a javaScript object('content')
    var data = content.data;
                     // content.event -> Represents the type or event of the message received
                     // content.data -> Contains the actual data payload sent with the message.
    switch (content.event) {
        case "offer":
            handleOffer(data);
            break;
        case "answer":
            handleAnswer(data);
            break;
        case "candidate":
            handleCandidate(data);
            break;
        default:
            break;
    }
};

conn.onopen = function() {
    console.log("Connected to the signaling server");
};

// This function sends a JSON-encoded message to the signaling server via the WebSocket.
function send(message) {
    conn.send(JSON.stringify(message));
                  // JSON.stringify(message) -> convert the javaScript 'message' object into a JSON string.
                  // conn.send() -> Sends the JSON- serialized 'message' over the WebSocket connection represents by the 'conn' variable.
}

function start(isCaller) {
    peerConnection = new RTCPeerConnection(null);  // Initiate new RTCPeerConnection instance

    // Creating new DataChannel named dataChannel with reliable Delivery
    dataChannel = peerConnection.createDataChannel("dataChannel", { reliable: true });
    // Set up data channel event Handlers
    setupDataChannel();
    console.log("hello parthu");
    peerConnection.onicecandidate = function(event) {  // Sends ICE candidates to the signaling server as they are discovered.
        if (event.candidate) {  // (event.candidate -> contain newly discovered ICE candidate
            send({              // send -> function to send the candidate to the signaling server
                event: "candidate",   // event is string (candidate, offer, answer)
                data: event.candidate
            });
        }
    };

    peerConnection.ondatachannel = function(event) {
        dataChannel = event.channel;  // event.channel -> contain received data channel
        setupDataChannel();  // function to setupDataChannel with event handlers for open, close and message events
    };

    if (isCaller) {  // (isCaller = true) creating offer
        peerConnection.createOffer().then(function(offer) {
            return peerConnection.setLocalDescription(offer);
        }).then(function() {
            send({
                event: "offer",
                data: peerConnection.localDescription
            });
        }).catch(function(error) {
            console.log("Error creating an offer: ", error);
        });
    }
}

function setupDataChannel() {
    // onopen -> (Event Handler) - this handler is executed when the data channel(dataChannel) is successfully opened and ready for communication.
    dataChannel.onopen = function() {
        console.log("Data channel is open");
        fileInput.disabled = false; // Enable file input when data channel is open
    };

    dataChannel.onclose = function() {  // When another peer disconnect this handles trigger
        console.log("Data channel is closed");
    };

    dataChannel.onmessage = function(event) {  // Handles incoming messages (file chunks) and passes them to receiveFile.

//        console.log(event.event);
        receiveFile(event.data);
    };

    fileInput.addEventListener('change', handleFileInputChange);
}

function handleFileInputChange(event) {
    console.log("hello");
    var file = event.target.files[0]; // retrieves the first file selected by the user from the event object.
    if (file && dataChannel.readyState === 'open') {  // dataChannel.readyState === 'open' -> checks if the data channel(dataChennel) is in the 'open' state. this state indicates that the channel is ready to send and receive data.
                                                      //  The readyState -> property of 'RTCDataChannel' can have the following values.
                                                                        // 'connecting' -> the channel is connecting
                                                                        // 'open' -> The channel is open and ready to communicate
                                                                        // 'closing' -> the channel is closing
                                                                        // 'closed' -> The channel is closed
        sendFile(file);
    } else {
        console.log("Data channel is not open or no file selected");
    }
}

function handleOffer(offer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer)).then(function() {
                                // Sets the received 'offer' as the remote description of the 'peerConnection'. It prepares the connection to accept the parameters offered by the remote peer('offer')
                                // After setting the remote description successfully, this chain of 'then' handles creates and answer to the offer. The 'createanswer' method generates and SDP answer based on the local peer's capabilities.
        return peerConnection.createAnswer();
    }).then(function(answer) {
                            // once the answer is created, it sets the locally generate answer ('answer') as the local description of the 'peerConnection'. This step prepares the local peer to respond to the remote peer's offer with it's own parameters.
        return peerConnection.setLocalDescription(answer);
    }).then(function() { // it send the answer back to the remote peer via the send function. This completes the exchange of SDP
        send({
            event: "answer",
            data: peerConnection.localDescription
        });
    }).catch(function(error) {  // Handles any errors that may occur the process of handling the offer.
        console.log("Error handling offer: ", error);
    });
}

function handleAnswer(answer) {  // function is designed to process an SDP answer received form the remote peer in a webRTC connection.
                                 //
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer)).catch(function(error) {
            // sets the received 'answer' as the remote description of the 'peerConnection'.
            // RTCSessionDescription' constructor creates a new session description object using the provided SDP 'answer'.
            // 'setRemoteDescription' -> is a promise-based mathod that configures the local peet to expect the connection parameters described in the 'answer'.

        console.log("Error handling answer: ", error);
    });
}

function handleCandidate(candidate) {  // is designed to process ICE(interactive Connectivity Establishment) candidates received from the remote peer. This function is crucial for establishing the network paths needed for a WebRTC connection, allowing peers to communicate directly.

    peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(function(error) {
                // adds the received ICE candidate to the 'peerConnection'
                // 'RTCIceCandidate' constructor create a new ICE candidate object using the provided candidate information
                // 'addIceCandidate' is a promise-based method that adds the ICE candiate tot he peer connection, helping it to discover the network paths for communication.
                // ICE candidates are used to discover the network paths between peer.
        console.log("Error adding received ICE candidate: ", error);
    });
}

function sendFile(file) {
    const stream = file.stream();  // Obtains a ReadableStream from the 'file' object
                                   // This stream allows reading the file in chunks
    const reader = stream.getReader(); // this reader is used to sequentially read chunks from the stream

    function read() {  // Recursive function
                       // done -> A boolean var indicating whether the end of the stream has been reached ot not
                                  // done = true -> reached end of the read
                                  // done = false -> not reached end of the read
                       // value -> Contains the chunk data read from the stream.
        reader.read().then(({ done, value }) => {
            if (done) {
                console.log('File sent successfully');
                return;
            }
            dataChannel.send(value);  // it sends the value over the dataChannel using send(value)
            read();
        }).catch(error => {
            console.error('Error reading file:', error);
        });
    }

    read();
}

function receiveFile(data) {  // is responsible for accumulating received data chunks (ArrayBuffers), reconstructing them into a Blob once the entire file is received, and then providing a way for the user to download the received file.
//    receivedBuffers.push(data);  // receivedBuffers is an array, store each chunk of file received from channel.

    // Assuming the end of the file is signaled by an empty ArrayBuffer
    if (data.byteLength < chunkSize) {  // this condition true when data is end of the file(last chunk)
        // receivedBuffers array contains all the chunks of the file

        const receivedBlob = new Blob(receivedBuffers);  // Creating a Blob object(receiveBlob) from the accumulated chunks(receivedBuffers)
                                                         // A Blob represents immutable raw data, typically large binary data such as files
        const link = document.getElementById('downloadLink');
        link.href = URL.createObjectURL(receivedBlob);  // sets the "href" attribute of the link to a URL representing the Blob
                                                        // createObjectURL -> create a unique URL that represents the Blob object
        link.download = 'received_file';     // sets the "download" attribute of the link to specify the default file name for the downloaded file
//        link.download = fileName;
        link.style.display = 'block';        // makes the link visible by setting its display style to block
        link.textContent = 'Download the received file';
        receivedBuffers = []; // Clear the buffer
    }
}

// Start as caller
start(true);
