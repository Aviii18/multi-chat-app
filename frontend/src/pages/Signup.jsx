import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Container, Form, Button, Card } from "react-bootstrap";

export default function Signup() {
  const { signup } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signup(username, password);
      navigate("/chat");
    } catch {
      alert("Signup failed");
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100 bg-dark text-light">
      <Card className="p-4 shadow-lg bg-secondary rounded">
        <h3 className="text-center mb-3">Signup</h3>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Form.Group>
          <Button type="submit" className="w-100 btn-dark">Signup</Button>
        </Form>
      </Card>
    </Container>
  );
}
