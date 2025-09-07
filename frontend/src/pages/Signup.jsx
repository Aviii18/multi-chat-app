import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Signup = () => {
  const { signup } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

const handleSignup = async (e) => {
  e.preventDefault();
  console.log("🚀 Sending signup request:", JSON.stringify({ username, password }));


  const res = await fetch("http://127.0.0.1:8000/api/signup/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (res.ok) {
    alert("Signup successful! Please login.");
    window.location.href = "/";
  } else {
    alert("Signup failed: " + data.error);
  }
};


  return (
    <div className="d-flex vh-100 justify-content-center align-items-center bg-dark text-light">
      <form
        className="p-4 rounded bg-secondary"
        style={{ minWidth: "300px" }}
        onSubmit={handleSignup}
      >
        <h3 className="text-center mb-3">Signup</h3>
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
          Signup
        </button>
      </form>
      <p className="mt-2">
        Already have an account? <a href="/">Login here</a>
      </p>
    </div>
  );
};

export default Signup;
