# server/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from chat.views import RoomViewSet, MessageViewSet, signup, heartbeat  # ← add heartbeat

router = DefaultRouter()
router.register(r"rooms", RoomViewSet, basename="room")
router.register(r"messages", MessageViewSet, basename="message")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include([
        path("", include(router.urls)),
        path("signup/", signup, name="signup"),
        path("me/heartbeat/", heartbeat, name="heartbeat"),  # ← add this
        path("schema/", SpectacularAPIView.as_view(), name="schema"),
        path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("auth/", include("chat.jwt_urls")),
    ])),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
