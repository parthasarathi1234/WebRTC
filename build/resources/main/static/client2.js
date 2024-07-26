var conn = new WebSocket('ws://localhost:8080/socket');  // this line initialize a websocket connection to a signaling server running at "ws://localhost:8080/socket"
var peerConnection;
var dataChannel;
var fileReader;
var chunkSize = 64*1024; // Size of each chunk to send (64KB)
var receivedBuffers = [];
var fileInput = document.getElementById('fileInput');
var fileName;


// conn.onmessage: Handles incoming messages from the signaling server. It parses the message data and calls appropriate handlers based on the event type (offer, answer, or candidate).
conn.onopen = function() {
    console.log("Connected to the signaling server parthu");
    console.log(chunkSize);
};

conn.onmessage = function(msg) {
    var content = JSON.parse(msg.data);
    var data = content.data;
    switch (content.event) {
        case "offer":
            console.log("conn.onMessage - offer");
            handleOffer(data);
            break;
        case "answer":
            console.log("conn.onMessage - answer")
            handleAnswer(data);
            break;
        case "candidate":
            console.log("conn.onMessage - candidate")
            handleCandidate(data);
            break;
        default:
            break;
    }
};

function send(message) {
    conn.send(JSON.stringify(message));
}
function start(isCaller) {
    peerConnection = new RTCPeerConnection(null); //  Initializes a new RTCPeerConnection instance.

    dataChannel = peerConnection.createDataChannel("dataChannel", { reliable: true });  // Creates a data channel named dataChannel with reliable delivery.

    setupDataChannel();  // Sets up data channel event handlers.
    console.log("after setupDataChannel");

    peerConnection.onicecandidate = function(event) {  // Sends ICE candidates to the signaling server as they are discovered.
        if (event.candidate) {
            console.log("onicecandidate");
            send({  event: "candidate",  data: event.candidate  });
        }
    };

    peerConnection.ondatachannel = function(event) {  // peerConnection.ondatachannel: Sets up the data channel when it is received from the remote peer.
        console.log("ondatachannel");
        dataChannel = event.channel;
        setupDataChannel();
    };

    if (isCaller) {
        console.log("isCaller");
        peerConnection.createOffer().then(function(offer) {
            console.log("in creating offer");
            return peerConnection.setLocalDescription(offer);
        }).then(function() {
            console.log("sending offer");
            send({   // sending offer
                event: "offer",
                data: peerConnection.localDescription  // data is local system ip and port
            });
        }).catch(function(error) {
            console.log("Error creating an offer: ", error);
        });
    }
}

function setupDataChannel() {
    console.log("setupDataChannel");
    dataChannel.onopen = function() {  // Enables the file input when the data channel is open.
        console.log("Data channel is open");
        fileInput.disabled = false; // Enable file input when data channel is open
    };

    dataChannel.onclose = function() {  //  Logs a message when the data channel is closed.
        console.log("Data channel is closed");
    };

    dataChannel.onmessage = function(event) {  //  Handles incoming messages (file chunks) and passes them to receiveFile.
        console.log("calling receiverFile");
        receiveFile(event.data);
    };
    fileInput.addEventListener('change', handleFileInputChange);  // Sets up the file input change event handler.
}

// This function is triggered when a file is selected. If the data channel is open, it calls sendFile to start sending the file.
function handleFileInputChange(event) {
    console.log("Before file select");
    var file = event.target.files[0];
    fileName = file.name;
    console.log(fileName);
    console.log("After file select");
    if (file && dataChannel.readyState === 'open') {
        sendFile(file);
    } else {
        console.log("Data channel is not open or no file selected");
    }
}

// Handles the incoming SDP offer by setting it as the remote description, creating an SDP answer, setting it as the local description, and sending the answer to the signaling server.
function handleOffer(offer) {
    console.log("handleOffer");
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer)).then(function() {
        return peerConnection.createAnswer();
    }).then(function(answer) {
        return peerConnection.setLocalDescription(answer);
    }).then(function() {
        console.log("sending answer")
        send({
            event: "answer",
            data: peerConnection.localDescription
        });
    }).catch(function(error) {
        console.log("Error handling offer: ", error);
    });
}

// Handles the incoming SDP answer by setting it as the remote description.
function handleAnswer(answer) {
    console.log("handleAnswer");
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    .catch(function(error) {
        console.log("Error handling answer: ", error);
    });
}

// Handles incoming ICE candidates by adding them to the peer connection.
function handleCandidate(candidate) {
    console.log("handleCandidate");
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    .catch(function(error) {
        console.log("Error adding received ICE candidate: ", error);
    });
}

function sendFile(file) {
    console.log("sendFile");
    dataChannel.send(JSON.stringify({ type: 'fileName', name: file.name }));
    fileReader = new FileReader();
    var offset = 0;

    fileReader.onload = function(event) {
//        dataChannel.send(event.target.result);
//        offset += event.target.result.byteLength;  // Reads the file slice by slice (16KB each).
//        if (offset < file.size) {
//            readSlice(offset);
//        }
          if (dataChannel.readyState === 'open') {
                      try {
                          dataChannel.send(event.target.result);
                          offset += event.target.result.byteLength;  // Reads the file slice by slice (64KB each).
                          if (offset < file.size) {
                              readSlice(offset);
                          }
                      }
                      catch (error) {
                          console.log("Error sending chunk: ", error);
                          // Retry sending the chunk after a small delay
//                          setTimeout(() => {
//                              readSlice(offset);
//                          }, 100);
                      }
                  }
//                  else {
//                      // Retry sending the chunk after a small delay
//                      setTimeout(() => {
//                          readSlice(offset);
//                      }, 100);
//                  }


    };

    fileReader.onerror = function(error) {
        console.log("Error reading file: ", error);
    };

    function readSlice(offset) {
        var slice = file.slice(offset, offset + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    }

    readSlice(0);
}

function receiveFile(data) {
    if(typeof data === 'string'){
        var parseData = JSON.parse(data);
        if(parseData.type === 'fileName'){
            fileName = parseData.name;
            console.log(`receiving file : ${fileName}`);
            return;
        }
    }
    receivedBuffers.push(data); // Pushes each received chunk to receivedBuffers.

    // Assuming the end of the file is signaled by an empty ArrayBuffer
    if (data.byteLength < chunkSize) {
//        console.log("receiver side ",fileName);
        var receivedBlob = new Blob(receivedBuffers);
        var link = document.getElementById('downloadLink');
        link.href = URL.createObjectURL(receivedBlob);
        link.download = fileName || 'received_file';
        link.style.display = 'block';
        link.textContent = `${fileName || 'received'}`;
        receivedBuffers = []; // Clear the buffer
    }
}

const id = document.getElementById("sendFile");
id.addEventListener("click", start, true);  // through id for button click

