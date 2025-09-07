// src/pages/Login.jsx
import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch("http://127.0.0.1:8000/api/auth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("accessToken", data.access);
      localStorage.setItem("refreshToken", data.refresh);
      window.location.href = "/chat";
    } else {
      alert("Invalid credentials");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Error connecting to server");
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
      <p className="mt-2 text-center w-100">
        Don't have an account? <a href="/signup">Signup here</a>
      </p>
    </div>
  );
};

export default Login;

