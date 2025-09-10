# chat/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Room, Message

User = get_user_model()

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username")

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ("id", "name", "is_private")

class MessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Message
        fields = ("id", "room", "sender", "content", "file", "timestamp")
        read_only_fields = ("id", "sender", "timestamp")
