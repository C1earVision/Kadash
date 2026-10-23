"""Verify Node-issued JWTs (same secret as BackEnd)."""

from __future__ import annotations

import os
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Optional

import jwt
from fastapi import HTTPException, Request


@dataclass(frozen=True)
class AuthUser:
    customer_id: int
    name: str
    is_admin: bool


def extract_bearer_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return token


def verify_access_token(token: str) -> AuthUser:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET is not configured on AI backend")

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    customer_id = payload.get("customerId")
    if customer_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    name = payload.get("name") or ""
    is_admin = bool(payload.get("admin"))
    return AuthUser(customer_id=int(customer_id), name=str(name), is_admin=is_admin)


def auth_from_request(request: Request) -> AuthUser:
    auth = getattr(request.state, "auth_user", None)
    if auth is None:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return auth


def bearer_from_request(request: Request) -> str:
    token = getattr(request.state, "bearer_token", None)
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return token


@contextmanager
def auth_request_context(auth: AuthUser, bearer_token: str):
    from Utils.request_context import current_auth_user, current_bearer_token

    t_bearer = current_bearer_token.set(bearer_token)
    t_auth = current_auth_user.set(auth)
    try:
        yield
    finally:
        current_bearer_token.reset(t_bearer)
        current_auth_user.reset(t_auth)
