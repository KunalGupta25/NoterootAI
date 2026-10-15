from dataclasses import dataclass

from fastapi.testclient import TestClient

from core.dependencies import require_database
from main import create_app


@dataclass
class Result:
    matched_count: int = 0


class Users:
    def __init__(self):
        self.items = []

    async def find_one(self, query, *_):
        for item in self.items:
            if all(item.get(key) == value for key, value in query.items()):
                return dict(item)
        return None

    async def insert_one(self, item):
        if await self.find_one({"email": item["email"]}):
            raise RuntimeError("duplicate key")
        self.items.append(dict(item))

    async def update_one(self, query, update):
        for item in self.items:
            if all(item.get(key) == value for key, value in query.items()):
                item.update(update["$set"])
                return Result(matched_count=1)
        return Result()


class Database:
    def __init__(self):
        self.users = Users()


def client():
    app = create_app()
    database = Database()
    app.dependency_overrides[require_database] = lambda: database
    return TestClient(app)


def test_health_contract():
    response = client().get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "NoteRoot API is running"
    assert "db" in data
    assert isinstance(data["db"]["mongo"], bool)
    assert isinstance(data["db"]["neo4j"], bool)


def test_signup_login_and_settings_contract():
    api = client()
    signup = api.post("/api/auth/signup", json={"name": "Ada", "email": "ada@example.com", "password": "password-123"})
    assert signup.status_code == 201
    body = signup.json()
    assert body["user"] == {"id": body["user"]["id"], "name": "Ada", "email": "ada@example.com"}

    login = api.post("/api/auth/login", json={"email": "ada@example.com", "password": "password-123"})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['token']}"}

    update = api.put("/api/auth/settings", headers=headers, json={"activeProvider": "openai", "providerKeys": {"openai": "test-key"}})
    assert update.status_code == 200
    assert update.json() == {"success": True}

    settings = api.get("/api/auth/settings", headers=headers)
    assert settings.status_code == 200
    assert settings.json()["activeProvider"] == "openai"
    assert settings.json()["providerKeys"] == {"openai": "test-key"}


def test_missing_token_uses_legacy_error_shape():
    response = client().get("/api/auth/settings")
    assert response.status_code == 401
    assert response.json() == {"error": "Authentication required"}
