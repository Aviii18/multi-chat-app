# chat/apps.py
from django.apps import AppConfig
from django.db.backends.signals import connection_created

def _set_sqlite_pragmas(sender, connection, **kwargs):
    if connection.vendor == "sqlite":
        with connection.cursor() as c:
            c.execute("PRAGMA journal_mode=WAL;")
            c.execute("PRAGMA busy_timeout=3000;")

class ChatConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "chat"

    def ready(self):
        connection_created.connect(_set_sqlite_pragmas)
