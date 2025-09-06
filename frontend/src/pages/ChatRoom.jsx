// src/pages/ChatRoom.jsx
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const ChatRoom = () => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const roomId = 1; // temporary
  const userId = 1; // should come from backend later

  useEffect(() => {
    const ws = new WebSocket(`ws://127.0.0.1:9000/ws/${roomId}/${userId}`);

    ws.onopen = () => console.log("✅ Connected to WebSocket");
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setMessages((prev) => [...prev, msg]);
    };
    ws.onclose = () => console.log("❌ Disconnected");

    setSocket(ws);

    return () => ws.close();
  }, []);

  const sendMessage = () => {
    if (input.trim() !== "") {
      socket.send(JSON.stringify({ content: input, file: null }));
      setInput("");
    }
  };

  return (
    <div className="vh-100 d-flex flex-column bg-dark text-light">
      <div className="flex-grow-1 overflow-auto p-3">
        {messages.map((msg, i) => (
          <div key={i} className="mb-2">
            <b>{msg.sender_id}:</b> {msg.content}
          </div>
        ))}
        {typing && <p className="text-muted">Someone is typing...</p>}
      </div>

      <div className="p-3 d-flex">
        <input
          type="text"
          className="form-control me-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={() => setTyping(true)}
          onKeyUp={() => setTimeout(() => setTyping(false), 1000)}
        />
        <button className="btn btn-light" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
