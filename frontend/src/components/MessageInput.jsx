import React, { useState, useContext } from "react";
import { WebSocketContext } from "../context/WebSocketContext";

const MessageInput = () => {
  const { sendMessage, sendTyping } = useContext(WebSocketContext);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);

  const handleSend = () => {
    if (!text && !file) return;
    sendMessage(text, file);
    setText("");
    setFile(null);
  };

  return (
    <div className="d-flex p-2 bg-dark text-light">
      <input
        type="text"
        className="form-control me-2"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          sendTyping();
        }}
        placeholder="Type a message..."
      />
      <input type="file" onChange={(e) => setFile(e.target.files[0])} className="me-2" />
      <button className="btn btn-primary" onClick={handleSend}>
        Send
      </button>
    </div>
  );
};

export default MessageInput;
