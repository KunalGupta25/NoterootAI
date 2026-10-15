import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from main import create_app
from providers.factory import Provider, get_provider, _validate_custom_url, _provider_cache
from schemas.ai import AssistRequest, ChatRequest, Message, AgentRequest, AgentMessage


@pytest.fixture
def app_client():
    app = create_app()
    return TestClient(app)


def test_health_db_booleans(app_client):
    res = app_client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "db" in data
    assert isinstance(data["db"]["mongo"], bool)
    assert isinstance(data["db"]["neo4j"], bool)


def test_provider_lru_cache():
    p1 = get_provider("openai", "test-key-1")
    p2 = get_provider("openai", "test-key-1")
    assert p1 is p2
    # Check that raw api keys are never stored as dictionary keys
    for key_tuple in _provider_cache.keys():
        assert "test-key-1" not in key_tuple


def test_keyless_custom_provider():
    p = get_provider("custom", None, "http://localhost:11434/v1")
    assert p.api_key == "not-needed"
    assert p.name == "custom"


def test_custom_provider_requires_model():
    p = get_provider("custom", "key", "http://localhost:11434/v1")
    # Calling chat without model should raise ValueError
    with pytest.raises(ValueError, match="Model is required for custom provider"):
        async def run():
            async for _ in p.chat([Message(role="user", content="hi")], None, 0.7, 100):
                pass
        import asyncio
        asyncio.run(run())


def test_ssrf_ip_blocking():
    # In development, private IP should pass
    _validate_custom_url("http://127.0.0.1:11434/v1", "development")
    _validate_custom_url("http://192.168.1.100:11434/v1", "development")

    # In production, private IP / loopback should be rejected
    with pytest.raises(ValueError, match="private or restricted"):
        _validate_custom_url("http://127.0.0.1:11434/v1", "production")

    with pytest.raises(ValueError, match="private or restricted"):
        _validate_custom_url("http://192.168.1.5:11434/v1", "production")

    with pytest.raises(ValueError, match="private or restricted"):
        _validate_custom_url("http://10.0.0.1:11434/v1", "production")

    with pytest.raises(ValueError, match="private or restricted"):
        _validate_custom_url("http://169.254.169.254/latest/meta-data", "production")


def test_input_limits_message_content():
    with pytest.raises(ValueError):
        Message(role="user", content="a" * 100_001)

    # Valid message
    m = Message(role="user", content="a" * 1000)
    assert len(m.content) == 1000


def test_input_limits_max_messages():
    messages = [Message(role="user", content="hi") for _ in range(31)]
    with pytest.raises(ValueError):
        ChatRequest(messages=messages)


def test_input_limits_total_chars():
    # 2 messages of 65k each = 130k > 120k limit
    messages = [
        Message(role="user", content="a" * 65_000),
        Message(role="assistant", content="b" * 65_000),
    ]
    with pytest.raises(ValueError, match="Total message content exceeds 120,000"):
        ChatRequest(messages=messages)


def test_input_limits_max_tokens():
    with pytest.raises(ValueError):
        ChatRequest(messages=[Message(role="user", content="hi")], max_tokens=5000)


def test_request_body_size_limit_middleware(app_client):
    large_payload = "x" * (1_048_576 + 50)
    res = app_client.post(
        "/api/health",
        content=large_payload,
        headers={"Content-Type": "text/plain", "Content-Length": str(len(large_payload))},
    )
    assert res.status_code == 413


def test_agent_provider_prevalidation(app_client):
    # Invalid provider
    res = app_client.post(
        "/agent",
        json={
            "messages": [{"role": "user", "content": "hello"}],
            "provider": "unsupported_provider",
        },
    )
    assert res.status_code == 400

    # Custom provider without model
    res = app_client.post(
        "/agent",
        json={
            "messages": [{"role": "user", "content": "hello"}],
            "provider": "custom",
            "custom_base_url": "http://localhost:11434/v1",
            "model": "",
        },
    )
    assert res.status_code == 400
    assert "Model is required" in res.json()["error"]


def test_agent_error_stream():
    from services.agent_service import run_agent
    import asyncio

    # When provider fails, run_agent yields error event and [DONE]
    async def run():
        req = AgentRequest(
            messages=[AgentMessage(role="user", content="hello")],
            provider="openai",
            api_key="bad-key",
        )
        with patch("services.agent_service.get_provider") as mock_get:
            mock_prov = MagicMock()
            async def failing_agent(*args, **kwargs):
                raise RuntimeError("API key invalid (401)")
                yield {}
            mock_prov.agent = failing_agent
            mock_get.return_value = mock_prov

            chunks = []
            async for chunk in run_agent(req):
                chunks.append(chunk)
            assert any('"type": "error"' in c for c in chunks)
            assert chunks[-1] == "data: [DONE]\n\n"

    asyncio.run(run())


def test_sse_headers_returned(app_client):
    # Test that /assist returns the required SSE headers
    with patch("routers.ai.get_provider"):
        res = app_client.post(
            "/assist",
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "provider": "openai",
                "api_key": "dummy",
            },
        )
        assert res.headers.get("Cache-Control") == "no-cache"
        assert res.headers.get("X-Accel-Buffering") == "no"
