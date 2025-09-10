# realtime/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set

app = FastAPI(title="Realtime WS")

# DEV CORS - match your frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track sockets per room
rooms: Dict[int, Set[WebSocket]] = {}

def get_room_peers(room_id: int) -> Set[WebSocket]:
    return rooms.setdefault(room_id, set())

@app.get("/health")
def health():
    return {"status": "ok"}

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    q = ws.query_params
    room_id = int(q.get("room_id", "0"))
    username = q.get("username") or "unknown"

    peers = get_room_peers(room_id)
    peers.add(ws)

    # Announce online
    online_evt = {"type": "user:online", "room_id": room_id, "user": username}
    for peer in list(peers):
        await peer.send_json(online_evt)

    try:
        while True:
            raw = await ws.receive_text()
            # Forward message to all peers in the same room
            for peer in list(peers):
                await peer.send_text(raw)
    except WebSocketDisconnect:
        pass
    finally:
        peers.discard(ws)
        offline_evt = {"type": "user:offline", "room_id": room_id, "user": username}
        for peer in list(peers):
            await peer.send_json(offline_evt)
