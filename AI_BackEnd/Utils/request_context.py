"""Per-request context for cooperative query cancellation."""

from __future__ import annotations

import contextvars
from typing import TYPE_CHECKING, List, Optional

if TYPE_CHECKING:
    import httpx

    from Utils.jwt_auth import AuthUser

current_cancel_scope: contextvars.ContextVar[Optional["QueryCancelScope"]] = (
    contextvars.ContextVar("current_cancel_scope", default=None)
)

current_bearer_token: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "current_bearer_token", default=None
)

current_auth_user: contextvars.ContextVar[Optional["AuthUser"]] = contextvars.ContextVar(
    "current_auth_user", default=None
)


def get_api_bearer_token() -> Optional[str]:
    return current_bearer_token.get()


def get_auth_user() -> Optional["AuthUser"]:
    return current_auth_user.get()


def get_cancel_scope() -> Optional["QueryCancelScope"]:
    return current_cancel_scope.get()


class QueryCancelScope:
    """Signals cancellation and closes in-flight HTTP streams (e.g. Ollama)."""

    def __init__(self) -> None:
        self._cancelled = False
        self._http_clients: List["httpx.AsyncClient"] = []

    def is_cancelled(self) -> bool:
        return self._cancelled

    def cancel(self) -> None:
        self._cancelled = True

    def register_http_client(self, client: "httpx.AsyncClient") -> None:
        self._http_clients.append(client)

    async def abort_http(self) -> None:
        self.cancel()
        clients = list(self._http_clients)
        self._http_clients.clear()
        for client in clients:
            try:
                await client.aclose()
            except Exception:
                pass
