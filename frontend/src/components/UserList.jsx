import React, { useContext } from "react";
import { WebSocketContext } from "../context/WebSocketContext";

const UserList = () => {
  const { onlineUsers } = useContext(WebSocketContext);

  return (
    <div className="p-2 bg-dark text-light border-end" style={{ width: "200px" }}>
      <h6>Online Users</h6>
      {onlineUsers.map((id) => (
        <div key={id}>
          🟢 User {id}
        </div>
      ))}
    </div>
  );
};

export default UserList;
