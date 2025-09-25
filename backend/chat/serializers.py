# chat/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Room, Message, RoomState

User = get_user_model()

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username")

class RoomSerializer(serializers.ModelSerializer):
    is_member = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()                     # NEW
    created_by = UserMiniSerializer(read_only=True) 

    class Meta:
        model = Room
        fields = ("id", "name", "is_private", "is_member", "unread_count","created_by", "is_owner")

    def get_is_member(self, obj):
        request = self.context.get("request")
        if not request or request.user.is_anonymous:
            return False
        return obj.members.filter(id=request.user.id).exists()
    
    def get_is_owner(self, obj):
        u = self.context["request"].user
        return bool(obj.created_by_id and u.is_authenticated and obj.created_by_id == u.id)

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request or request.user.is_anonymous:
            return 0
        user = request.user
        # last_read for this user/room
        try:
            state = RoomState.objects.get(user=user, room=obj)
            last_read = state.last_read_at
        except RoomState.DoesNotExist:
            last_read = None
        qs = obj.messages.all()
        if last_read:
            qs = qs.filter(timestamp__gt=last_read)
        return qs.count()

class MessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Message
        fields = ("id", "room", "sender", "content", "file", "timestamp", "edited_at")
        read_only_fields = ("id", "sender", "timestamp", "edited_at")
