from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException,  Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ChatMessage, ChatRoom
from app.schemas import MessageCreate, MessageResponse, RoomCreate, RoomResponse
from datetime import datetime
from typing import Optional, List
import json



app = FastAPI()

active_connections = []

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


@app.get("/inspect-chat-message")
def inspect_chat_message(db: Session = Depends(get_db)):
    result = db.execute(text("PRAGMA table_info(chat_message);"))
    columns = []
    for row in result:
        columns.append({
            "cid": row[0],
            "name": row[1],
            "type": row[2],
            "notnull": row[3],
            "dflt_value": row[4],
            "pk": row[5]
        })
    return {"chat_message_schema": columns}

# --- GET all messages ---
@app.get("/messages", response_model=list[MessageResponse])
def get_messages(db: Session = Depends(get_db)):
    return db.query(ChatMessage).all()

# --- POST new message ---
@app.post("/messages", response_model=MessageResponse)
def create_message(message: MessageCreate, db: Session = Depends(get_db)):
    db_message = ChatMessage(
        content=message.content,
        file=message.file,
        sender_id=message.sender_id,
        room_id=message.room_id,
        timestamp=datetime.now()
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

# Create a new room
@app.post("/rooms", response_model=RoomResponse)
def create_room(room: RoomCreate, db: Session = Depends(get_db)):
    db_room = ChatRoom(name=room.name)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

# Get all rooms
@app.get("/rooms", response_model=List[RoomResponse])
def get_rooms(db: Session = Depends(get_db)):
    return db.query(ChatRoom).all()


@app.get("/rooms/{room_id}/messages", response_model=List[MessageResponse])
def get_room_messages(room_id: int, db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    messages = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).all()
    return messages


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await websocket.accept()
    await websocket.send_text(f"Hello Client #{client_id}")
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message from {client_id}: {data}")
# In-memory store for connected clients by room
rooms = {}

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


# Room-based active connections
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int, user_id: int, db: Session = Depends(get_db)):
    print(f"📡 New connection: Room {room_id}, User {user_id}")
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = []
    rooms[room_id].append(websocket)

    try:
        await websocket.send_text(f"✅ Connected to Room {room_id} as User {user_id}")

        # Fetch past messages
        try:
            past_messages = (
                db.query(ChatMessage)
                .filter(ChatMessage.room_id == room_id)
                .order_by(ChatMessage.timestamp.desc())
                .limit(20)
                .all()
            )
            print(f"💾 Found {len(past_messages)} past messages")
        except Exception as e:
            print("⚠️ Error fetching past messages:", e)
            past_messages = []

        for msg in reversed(past_messages):
            msg_response = MessageResponse.from_orm(msg)
            await websocket.send_text(msg_response.model_dump_json())


        while True:
            data = await websocket.receive_text()
            print(f"📥 Received raw: {data}")

            try:
                payload = json.loads(data)
            except Exception as e:
                print("⚠️ JSON decode error:", e)
                continue

            new_message = ChatMessage(
                content=payload.get("content", ""),
                file=payload.get("file"),
                timestamp=datetime.now(),
                sender_id=user_id,
                room_id=room_id,
            )
            db.add(new_message)
            db.commit()
            db.refresh(new_message)

            msg_response = MessageResponse.from_orm(new_message)

            for conn in rooms[room_id]:
                await conn.send_text(msg_response.model_dump_json())


    except WebSocketDisconnect:
        print(f"❌ User {user_id} disconnected from Room {room_id}")
        rooms[room_id].remove(websocket)
        if not rooms[room_id]:
            del rooms[room_id]
















# # Store active connections by room
# rooms = {}

# @app.websocket("/ws/{room_id}/{user_id}")
# async def websocket_endpoint(websocket: WebSocket, room_id: int, user_id: int, db: Session = Depends(get_db)):
#     await websocket.accept()

#     if room_id not in rooms:
#         rooms[room_id] = []
#     rooms[room_id].append(websocket)

#     try:
#         await websocket.send_text(f"✅ Connected to Room {room_id} as User {user_id}")

#         while True:
#             # Receive message from client
#             data = await websocket.receive_text()
#             msg_data = json.loads(data)

#             # Save message to DB
#             new_msg = ChatMessage(
#                 content=msg_data["content"],
#                 file=msg_data.get("file"),
#                 timestamp=datetime.now(),
#                 sender_id=user_id,
#                 room_id=room_id
#             )
#             db.add(new_msg)
#             db.commit()
#             db.refresh(new_msg)

#             # Prepare response
#             response = {
#                 "id": new_msg.id,
#                 "content": new_msg.content,
#                 "file": new_msg.file,
#                 "timestamp": str(new_msg.timestamp),
#                 "sender_id": new_msg.sender_id,
#                 "room_id": new_msg.room_id,
#             }

#             # Broadcast to everyone in the same room
#             for connection in rooms[room_id]:
#                 await connection.send_text(json.dumps(response))

#     except WebSocketDisconnect:
#         rooms[room_id].remove(websocket)
#         if not rooms[room_id]:
#             del rooms[room_id]










































# @app.websocket("/ws/{room_id}/{user_id}")
# async def websocket_endpoint(websocket: WebSocket, room_id: int, user_id: int, db: Session = Depends(get_db)):
#     await websocket.accept()
#     active_connections.append(websocket)
#     try:
#         while True:
#             data = await websocket.receive_text()
#             payload = json.loads(data)

#             # Create new message in DB
#             new_message = ChatMessage(
#                 content=payload["content"],
#                 file=payload.get("file"),
#                 timestamp=datetime.now(),
#                 sender_id=user_id,
#                 room_id=room_id,
#             )
#             db.add(new_message)
#             db.commit()
#             db.refresh(new_message)

#             # Convert to schema for response
#             msg_response = MessageResponse.from_orm(new_message)

#             # Broadcast to all active connections
#             for conn in active_connections:
#                 await conn.send_json(msg_response.dict())

#     except WebSocketDisconnect:
#         active_connections.remove(websocket)


# @app.get("/chat-messages", response_model=list[schemas.Message])
# def get_messages(db: Session = Depends(get_db)):
#     result = db.execute(text("SELECT * FROM chat_message"))
#     messages = []
#     for row in result:
#         messages.append({
#             "id": row[0],
#             "content": row[1],
#             "file": row[2] or "",
#             "timestamp": row[3],
#             "sender_id": row[4],
#             "room_id": row[5],
#         })
#     return messages

# @app.get("/messages")
# def get_messages(db: Session = Depends(get_db)):
#     messages = db.query(ChatMessage).all()
#     return [
#         {
#             "id": m.id,
#             "content": m.content,
#             "file": m.file,
#             "timestamp": str(m.timestamp),
#             "sender_id": m.sender_id,
#             "room_id": m.room_id
#         }
#         for m in messages
#     ]
