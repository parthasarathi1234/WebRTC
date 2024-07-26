package com.example.webRTCvideoTransfer.handler;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component

public class SocketHandler extends TextWebSocketHandler {
                                    /*
                                        TextWebSocketHandler -> which is a specialized handler for handling webSocket text messages.
                                     */
    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws InterruptedException, IOException {
        for (WebSocketSession webSocketSession : sessions) {
            if (webSocketSession.isOpen() && !session.getId().equals(webSocketSession.getId())) {
                webSocketSession.sendMessage(message);
            }
        }
    }

                                    /*
                                        WebSocketSession -> represents an individual websocket connection between the server and a client.
                                        CopyOnWriteArrayList -> ensures that adding or removing sessions are done safely even when multiple threads are accessing it concurrently. This is crucial in a webSocket context, where connections can be opened or closed asynchronously.

                                        handleTextMessage -> This method handles incoming text messages from a client and broadcasts them to all other connected clients. This method is called whenever a websocket client sends a text message to the server.
                                       WebSocketSession session -> The session of the client that sent the message
                                        TextMessage message -> The actual text message received from the client.
                                        for (WebSocketSession webSocketSession : sessions) {} -> Iterate ove all "webSocketSession" objects stored in the session list.
                                                      webSocketSession.isOpen() -> ensures that the session is still active and open. This avoids send message to closed sessions.
                                                      !session.getId().equals(webSocketSession.getId()) -> Ensures that the message is not sent back to the original sender. It compares the ID of the sending session wih the current session in the loop.
                                        webSocketSession.sendMessage(message);  ->  the message is sent to the current 'webSocketSession'.

                                     */

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
    }
                                    /*
                                        afterConnectionEstablished -> This method is called whenever a new websocket connection is successfully established.

                                     */
}


