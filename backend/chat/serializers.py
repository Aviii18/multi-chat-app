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
    is_member = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ("id", "name", "is_private", "is_member")

    def get_is_member(self, obj):
        user = self.context.get("request").user
        if not user or user.is_anonymous:
            return False
        return obj.members.filter(id=user.id).exists()


class MessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Message
        fields = ("id", "room", "sender", "content", "file", "timestamp")
        read_only_fields = ("id", "sender", "timestamp")
