# chat/views.py
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Room, Message
from .serializers import RoomSerializer, MessageSerializer

User = get_user_model()

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all().order_by("-created_at")
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.select_related("room", "sender").all().order_by("timestamp")
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        room_id = self.request.query_params.get("room")
        return qs.filter(room_id=room_id) if room_id else qs

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def signup(request):
    username = request.data.get("username")
    password = request.data.get("password")
    if not username or not password:
        return Response({"detail": "username and password required"}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"detail": "username already exists"}, status=400)
    user = User.objects.create_user(username=username, password=password)
    return Response({"id": user.id, "username": user.username}, status=status.HTTP_201_CREATED)
