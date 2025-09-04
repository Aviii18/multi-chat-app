from fastapi import FastAPI, WebSocket

app = FastAPI()

@app.get("/")
def health():
    return {"status": "ok"}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    await ws.send_text("Connected to FastAPI WS")
    while True:
        data = await ws.receive_text()
        await ws.send_text(f"Echo: {data}")
