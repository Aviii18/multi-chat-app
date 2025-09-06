// src/pages/Login.jsx
import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      window.location.href = "/chat";
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="d-flex vh-100 justify-content-center align-items-center bg-dark text-light">
      <form
        className="p-4 rounded bg-secondary"
        style={{ minWidth: "300px" }}
        onSubmit={handleLogin}
      >
        <h3 className="text-center mb-3">Login</h3>
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="form-control mb-3"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-light w-100" type="submit">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
