from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import create_app
from schemas.ai import SearchResponse, SearchResult


def get_test_client():
    app = create_app()
    return TestClient(app)


def test_assist_capabilities():
    client = get_test_client()
    resp = client.get("/assist/capabilities")
    assert resp.status_code == 200
    data = resp.json()
    assert "web_available" in data


def test_assist_basic_streaming():
    client = get_test_client()

    async def mock_stream(*args, **kwargs):
        yield {"type": "text", "content": "Assistant "}
        yield {"type": "text", "content": "reply."}
        yield {
            "type": "usage",
            "usage": {"prompt_tokens": 15, "completion_tokens": 4, "total_tokens": 19},
        }

    mock_provider = AsyncMock()
    mock_provider.chat_stream = mock_stream

    with patch("routers.ai.get_provider", return_value=mock_provider), \
         patch("services.ai_service.get_provider", return_value=mock_provider):
        resp = client.post(
            "/assist",
            json={
                "messages": [
                    {"role": "system", "content": "You are NoteRoot assistant."},
                    {"role": "user", "content": "Hello!"},
                ],
                "mode": "chat",
                "provider": "openai",
                "api_key": "test-key",
            },
        )
        assert resp.status_code == 200
        content = resp.text
        assert "data: " in content
        assert '"type": "meta"' in content
        assert '"content": "Assistant "' in content
        assert '"content": "reply."' in content
        assert '"type": "usage"' in content
        assert "data: [DONE]" in content


def test_assist_with_web_search():
    client = get_test_client()

    captured_messages = []

    async def mock_stream(messages, *args, **kwargs):
        captured_messages.extend(messages)
        yield {"type": "text", "content": "Web aware reply."}

    mock_provider = AsyncMock()
    mock_provider.chat_stream = mock_stream

    mock_web_results = [
        {
            "title": "Python 3.12 Release Notes",
            "url": "https://python.org/doc/3.12",
            "snippet": "New features include isolated subinterpreters.",
        }
    ]

    with patch("routers.ai.get_provider", return_value=mock_provider), \
         patch("services.ai_service.get_provider", return_value=mock_provider), \
         patch("services.web_search.web_search_service.is_available", return_value=True), \
         patch("services.web_search.web_search_service.search", new_callable=AsyncMock, return_value=mock_web_results):

        resp = client.post(
            "/assist",
            json={
                "messages": [
                    {"role": "user", "content": "What is new in Python 3.12 today?"},
                ],
                "mode": "chat",
                "provider": "openai",
                "api_key": "test-key",
                "web": {"enabled": True, "max_results": 2},
            },
        )

        assert resp.status_code == 200
        assert "Python 3.12 Release Notes" in resp.text
        # Verify prompt had the web block injected
        user_msg = next((m for m in captured_messages if m["role"] == "user"), None)
        assert user_msg is not None
        assert "<web n=\"1\"" in user_msg["content"]
        assert "https://python.org/doc/3.12" in user_msg["content"]


def test_assist_with_vault():
    client = get_test_client()

    captured_messages = []

    async def mock_stream(messages, *args, **kwargs):
        captured_messages.extend(messages)
        yield {"type": "text", "content": "Vault aware reply."}

    mock_provider = AsyncMock()
    mock_provider.chat_stream = mock_stream

    mock_search_resp = SearchResponse(
        results=[
            SearchResult(
                note_id="note_999",
                title="Project Architecture",
                excerpt="The database schema uses Neo4j for graphs and MongoDB for state.",
                score=0.88,
                tags=["architecture"],
            )
        ]
    )

    with patch("routers.ai.get_provider", return_value=mock_provider), \
         patch("services.ai_service.get_provider", return_value=mock_provider), \
         patch("services.ai_service.search_notes", new_callable=AsyncMock, return_value=mock_search_resp):

        resp = client.post(
            "/assist",
            json={
                "messages": [
                    {"role": "user", "content": "Did I write about database schema in my notes?"},
                ],
                "mode": "chat",
                "provider": "openai",
                "api_key": "test-key",
                "vault": {"enabled": True, "top_k": 3, "min_score": 0.5},
            },
        )

        assert resp.status_code == 200
        assert "Project Architecture" in resp.text
        user_msg = next((m for m in captured_messages if m["role"] == "user"), None)
        assert user_msg is not None
        assert '<vault title="Project Architecture" id="note_999">' in user_msg["content"]


def test_assist_error_resilience():
    client = get_test_client()

    async def mock_error_stream(*args, **kwargs):
        raise RuntimeError("Provider connection failed")
        yield  # make it a generator

    mock_provider = AsyncMock()
    mock_provider.chat_stream = mock_error_stream

    with patch("routers.ai.get_provider", return_value=mock_provider), \
         patch("services.ai_service.get_provider", return_value=mock_provider):

        resp = client.post(
            "/assist",
            json={
                "messages": [{"role": "user", "content": "Help me."}],
                "mode": "chat",
                "provider": "openai",
                "api_key": "test-key",
            },
        )

        assert resp.status_code == 200
        text = resp.text
        assert '"type": "error"' in text
        assert "Provider connection failed" in text
        assert "data: [DONE]" in text
