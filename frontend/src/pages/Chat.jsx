import { useState } from "react";
import { Container, Row, Col, ListGroup, Form, Button, Card } from "react-bootstrap";

export default function Chat() {
  const [rooms] = useState([
    { id: 1, name: "General" },
    { id: 2, name: "Developers" },
    { id: 3, name: "Random" },
  ]);
  const [activeRoom, setActiveRoom] = useState(rooms[0]);
  const [messages, setMessages] = useState([
    { sender: "Alice", content: "Hey everyone 👋" },
    { sender: "Bob", content: "Hello Alice!" },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = { sender: "You", content: newMessage };
    setMessages([...messages, msg]);
    setNewMessage("");
  };

  return (
    <Container fluid className="vh-100 bg-dark text-light">
      <Row className="h-100">
        {/* Sidebar */}
        <Col md={3} className="bg-secondary p-0 d-flex flex-column">
          <div className="p-3 border-bottom border-dark">
            <h5 className="text-center">💬 Chat Rooms</h5>
          </div>
          <ListGroup variant="flush" className="flex-grow-1 overflow-auto">
            {rooms.map((room) => (
              <ListGroup.Item
                key={room.id}
                action
                onClick={() => setActiveRoom(room)}
                active={activeRoom.id === room.id}
                className="bg-dark text-light border-secondary"
              >
                {room.name}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>

        {/* Chat area */}
        <Col md={9} className="d-flex flex-column">
          <Card className="flex-grow-1 bg-dark text-light border-0">
            <Card.Header className="bg-secondary">
              <h5 className="mb-0">{activeRoom.name}</h5>
            </Card.Header>
            <Card.Body className="d-flex flex-column overflow-auto">
              <div className="flex-grow-1 mb-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`mb-2 ${msg.sender === "You" ? "text-end" : "text-start"}`}
                  >
                    <span
                      className={`p-2 rounded ${
                        msg.sender === "You" ? "bg-primary text-white" : "bg-secondary text-light"
                      }`}
                    >
                      <strong>{msg.sender}: </strong> {msg.content}
                    </span>
                  </div>
                ))}
              </div>

              {/* Input box */}
              <Form onSubmit={sendMessage} className="d-flex">
                <Form.Control
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="me-2 bg-dark text-light border-secondary"
                />
                <Button type="submit" variant="primary">
                  Send
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
