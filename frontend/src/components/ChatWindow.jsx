import React, { useContext } from "react";
import { WebSocketContext } from "../context/WebSocketContext";

const ChatWindow = () => {
  const { messages, typingUsers } = useContext(WebSocketContext);

  return (
    <div className="chat-window bg-dark text-light p-3" style={{ height: "70vh", overflowY: "scroll" }}>
      {messages.map((msg, idx) => (
        <div key={idx} className="mb-2">
          <strong>User {msg.sender_id}:</strong> {msg.content}
          {msg.file && (
            <div>
              <a href={msg.file} target="_blank" rel="noreferrer" className="text-info">
                📎 File
              </a>
            </div>
          )}
        </div>
      ))}
      {typingUsers.length > 0 && <div className="text-muted">Someone is typing...</div>}
    </div>
  );
};

export default ChatWindow;
