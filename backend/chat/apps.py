# chat/apps.py
from django.apps import AppConfig
from django.db import connection

class ChatConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "chat"

    def ready(self):
        try:
            with connection.cursor() as c:
                c.execute("PRAGMA journal_mode=WAL;")
                c.execute("PRAGMA busy_timeout=3000;")
        except Exception:
            pass
