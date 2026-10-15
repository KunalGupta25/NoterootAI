import asyncio
import time
from typing import Any

import httpx

from config import get_settings


class WebSearchService:
    def __init__(self):
        # In-memory cache: query -> (timestamp, list[dict])
        self._cache: dict[str, tuple[float, list[dict[str, str]]]] = {}
        self._cache_ttl_seconds = 600.0  # 10 minutes
        # Simple sliding window rate limiter: list of timestamps
        self._request_times: list[float] = []
        self._rate_limit_max_requests = 15
        self._rate_limit_window_seconds = 60.0
        self._lock = asyncio.Lock()

    def is_available(self) -> bool:
        settings = get_settings()
        provider = (settings.web_search_provider or "").strip().lower()
        if provider == "tavily" and (settings.tavily_api_key or "").strip():
            return True
        if provider == "brave" and (settings.brave_api_key or "").strip():
            return True
        if provider == "searxng" and (settings.searxng_url or "").strip():
            return True
        return False

    def _clean_query(self, query: str) -> str:
        # Cap query at 200 chars and strip whitespace
        return (query or "").strip()[:200]

    async def _check_rate_limit(self) -> bool:
        async with self._lock:
            now = time.monotonic()
            self._request_times = [t for t in self._request_times if now - t < self._rate_limit_window_seconds]
            if len(self._request_times) >= self._rate_limit_max_requests:
                return False
            self._request_times.append(now)
            return True

    async def search(self, raw_query: str, max_results: int = 3) -> list[dict[str, str]]:
        query = self._clean_query(raw_query)
        if not query:
            return []

        # Check cache
        now = time.time()
        cached = self._cache.get(query)
        if cached:
            timestamp, results = cached
            if now - timestamp < self._cache_ttl_seconds:
                return results[:max_results]

        if not self.is_available():
            return []

        allowed = await self._check_rate_limit()
        if not allowed:
            return []

        settings = get_settings()
        provider = (settings.web_search_provider or "").strip().lower()

        results: list[dict[str, str]] = []
        try:
            if provider == "tavily":
                results = await self._search_tavily(query, settings.tavily_api_key, max_results)
            elif provider == "brave":
                results = await self._search_brave(query, settings.brave_api_key, max_results)
            elif provider == "searxng":
                results = await self._search_searxng(query, settings.searxng_url, max_results)
        except Exception:
            # Degrade gracefully without crashing request stream
            return []

        # Store in cache
        if results:
            self._cache[query] = (now, results)

        return results[:max_results]

    async def _search_tavily(self, query: str, api_key: str, max_results: int) -> list[dict[str, str]]:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": max_results,
                },
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            out: list[dict[str, str]] = []
            for item in data.get("results", []):
                snippet = (item.get("content") or item.get("snippet") or "")[:300]
                out.append({
                    "title": item.get("title") or "Web Result",
                    "url": item.get("url") or "",
                    "snippet": snippet,
                })
            return out

    async def _search_brave(self, query: str, api_key: str, max_results: int) -> list[dict[str, str]]:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": max_results},
                headers={
                    "Accept": "application/json",
                    "X-Subscription-Token": api_key,
                },
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            out: list[dict[str, str]] = []
            web_results = data.get("web", {}).get("results", [])
            for item in web_results:
                snippet = (item.get("description") or item.get("snippet") or "")[:300]
                out.append({
                    "title": item.get("title") or "Web Result",
                    "url": item.get("url") or "",
                    "snippet": snippet,
                })
            return out

    async def _search_searxng(self, query: str, base_url: str, max_results: int) -> list[dict[str, str]]:
        url = base_url.rstrip("/") + "/search"
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                url,
                params={"q": query, "format": "json"},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            out: list[dict[str, str]] = []
            for item in data.get("results", []):
                snippet = (item.get("content") or "")[:300]
                out.append({
                    "title": item.get("title") or "Web Result",
                    "url": item.get("url") or "",
                    "snippet": snippet,
                })
            return out


web_search_service = WebSearchService()
