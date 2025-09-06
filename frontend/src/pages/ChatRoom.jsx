// src/pages/ChatRoom.jsx
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const ChatRoom = () => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const roomId = 1; // temporary
  const userId = user?.id || 1; // replace with real user later

  useEffect(() => {
    const ws = new WebSocket(`ws://127.0.0.1:9000/ws/${roomId}/${userId}`);

    ws.onopen = () => console.log("✅ Connected to WebSocket");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.event) {
        case "message:new":
          setMessages((prev) => [...prev, msg.data]);
          break;

        case "user:typing":
          if (!typingUsers.includes(msg.user_id) && msg.user_id !== userId) {
            setTypingUsers((prev) => [...prev, msg.user_id]);
            setTimeout(() => {
              setTypingUsers((prev) => prev.filter((id) => id !== msg.user_id));
            }, 1500);
          }
          break;

        case "user:online":
          setOnlineUsers((prev) =>
            prev.includes(msg.user_id) ? prev : [...prev, msg.user_id]
          );
          break;

        case "user:offline":
          setOnlineUsers((prev) => prev.filter((id) => id !== msg.user_id));
          break;

        default:
          console.log("ℹ️ Unknown event:", msg);
      }
    };

    ws.onclose = () => console.log("❌ Disconnected");
    setSocket(ws);

    return () => ws.close();
  }, []);

  const sendMessage = () => {
    if (input.trim() !== "" && socket) {
      socket.send(JSON.stringify({ event: "message:new", content: input, file: null }));
      setInput("");
    }
  };

  const sendTyping = () => {
    if (socket) {
      socket.send(JSON.stringify({ event: "user:typing" }));
    }
  };

  return (
    <div className="vh-100 d-flex flex-column bg-dark text-light">
      {/* Online users */}
      <div className="p-2 border-bottom">
        <b>Online:</b> {onlineUsers.length > 0 ? onlineUsers.join(", ") : "None"}
      </div>

      {/* Messages */}
      <div className="flex-grow-1 overflow-auto p-3">
        {messages.map((msg, i) => (
          <div key={i} className="mb-2">
            <b>{msg.sender_id}:</b> {msg.content}
          </div>
        ))}
        {typingUsers.length > 0 && (
          <p className="text-muted">{typingUsers.join(", ")} typing...</p>
        )}
      </div>

      {/* Input */}
      <div className="p-3 d-flex">
        <input
          type="text"
          className="form-control me-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={sendTyping}
        />
        <button className="btn btn-light" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
