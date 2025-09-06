from sqlalchemy import Column, Integer, Text, String, DateTime, func
from .database import Base


class ChatMessage(Base):
    __tablename__ = "chat_message"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    file = Column(String(100), nullable=True)
    timestamp = Column(DateTime, nullable=False, server_default=func.now())  
    sender_id = Column(Integer, nullable=False)
    room_id = Column(Integer, nullable=False)


class ChatRoom(Base):
    __tablename__ = "chat_room"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_private = Column(Integer, nullable=False, default=0)  # 0 = public, 1 = private

