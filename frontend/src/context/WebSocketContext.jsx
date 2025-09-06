import React, { createContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

export const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const ws = useRef(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) return;

    const url = `ws://127.0.0.1:9000/ws/1/${user.id}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => console.log("✅ WebSocket Connected");
    ws.current.onclose = () => console.log("❌ WebSocket Disconnected");

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 WS Event:", data);

      if (data.event === "message:new") {
        setMessages((prev) => [...prev, data.payload]);
      } else if (data.event === "user:typing") {
        setTypingUsers((prev) => [...new Set([...prev, data.payload.user_id])]);
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== data.payload.user_id));
        }, 2000);
      } else if (data.event === "user:online") {
        setOnlineUsers((prev) => [...new Set([...prev, data.payload.user_id])]);
      } else if (data.event === "user:offline") {
        setOnlineUsers((prev) => prev.filter((id) => id !== data.payload.user_id));
      }
    };

    return () => ws.current?.close();
  }, [user]);

  const sendMessage = (content, file = null) => {
    ws.current?.send(JSON.stringify({ content, file }));
  };

  const sendTyping = () => {
    ws.current?.send(JSON.stringify({ event: "user:typing" }));
  };

  return (
    <WebSocketContext.Provider value={{ messages, sendMessage, sendTyping, typingUsers, onlineUsers }}>
      {children}
    </WebSocketContext.Provider>
  );
};
