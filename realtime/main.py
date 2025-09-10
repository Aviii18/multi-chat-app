# realtime/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set, Tuple
import json, os, httpx

DJANGO_API_BASE = os.getenv("DJANGO_API_BASE", "http://localhost:8000/api")

app = FastAPI(title="Realtime WS")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

rooms: Dict[int, Set[WebSocket]] = {}
user_room_to_ws: Dict[Tuple[int, str], WebSocket] = {}

def peers(room_id: int) -> Set[WebSocket]:
    return rooms.setdefault(room_id, set())

async def is_member(room_id: int, token: str) -> bool:
    # Ask Django for the room; serializer returns `is_member`
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{DJANGO_API_BASE}/rooms/{room_id}/"
    async with httpx.AsyncClient(timeout=5) as client:
        r = await client.get(url, headers=headers)
    if r.status_code != 200:
        return False
    data = r.json()
    return bool(data.get("is_member"))

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    q = ws.query_params
    room_id = int(q.get("room_id", "0"))
    username = q.get("username") or "unknown"
    token = q.get("token") or ""

    # hard-stop if not member
    if not token or not await is_member(room_id, token):
        # Close with a policy violation code
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    key = (room_id, username)
    # (Optional) one active connection per user/room
    prev = user_room_to_ws.get(key)
    if prev:
        try: await prev.close()
        except: pass
    user_room_to_ws[key] = ws
    peers(room_id).add(ws)

    # announce online
    online_evt = {"type":"user:online","room_id":room_id,"user":username}
    for peer in list(peers(room_id)):
        await peer.send_json(online_evt)

    try:
        while True:
            raw = await ws.receive_text()
            for peer in list(peers(room_id)):
                await peer.send_text(raw)
    except WebSocketDisconnect:
        pass
    finally:
        peers(room_id).discard(ws)
        if user_room_to_ws.get(key) is ws:
            user_room_to_ws.pop(key, None)
        offline_evt = {"type":"user:offline","room_id":room_id,"user":username}
        for peer in list(peers(room_id)):
            await peer.send_json(offline_evt)
