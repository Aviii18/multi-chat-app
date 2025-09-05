from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def root():
    return {"status": "FastAPI running 🚀"}

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
    tables = [row[0] for row in result]
    return {"tables": tables}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await websocket.accept()
    await websocket.send_text(f"Hello Client #{client_id}")
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message from {client_id}: {data}")

# In-memory store for connected clients by room
rooms = {}



from sqlalchemy import text  # make sure this import exists

@app.get("/inspect-chat-message")
def inspect_chat_message(db: Session = Depends(get_db)):
    result = db.execute(text("PRAGMA table_info(chat_message);"))
    columns = [dict(row._mapping) for row in result]
    return {"chat_message_schema": columns}



@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int):
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = []
    rooms[room_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast message to all clients in this room
            for connection in rooms[room_id]:
                if connection is not websocket:  # don’t send back to sender if you don’t want echo
                    await connection.send_text(f"Room {room_id} says: {data}")
    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)
        if not rooms[room_id]:
            del rooms[room_id]
