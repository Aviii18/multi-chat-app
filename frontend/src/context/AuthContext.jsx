// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import API from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setUser({ username: localStorage.getItem("username") });
    }
  }, []);

  const login = async (username, password) => {
    try {
      const res = await API.post("/token/", { username, password });
      localStorage.setItem("token", res.data.access);
      localStorage.setItem("username", username);
      setUser({ username });
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
