"""Extract model reasoning and LangGraph tool traces for the UI."""

from __future__ import annotations

import json
import re
from typing import Any, List, Optional, Tuple, Union

from langchain_core.messages import AIMessage, AIMessageChunk, ToolMessage

from schemas.query_models import AgentStep

AGENT_ROUTING_CHOICES = frozenset(
    {
        "use_web_search_agent",
        "use_rag_agent",
        "use_crud_agent",
        "use_data_analysis_and_visualization_agent",
    }
)

def _think_tag_pattern(inner: str) -> re.Pattern[str]:
    open_tag = "<" + inner + ">"
    close_tag = "</" + inner + ">"
    return re.compile(re.escape(open_tag) + r"(.*?)" + re.escape(close_tag), re.DOTALL | re.IGNORECASE)


_THINKING_BLOCK_PATTERNS = (
    _think_tag_pattern("think"),
    _think_tag_pattern("redacted_thinking"),
)


def message_content_to_str(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                if block.get("type") == "text":
                    parts.append(str(block.get("text", "")))
                elif block.get("type") == "thinking":
                    parts.append(str(block.get("thinking", block.get("text", ""))))
        return "\n".join(p for p in parts if p)
    return str(content)


def split_thinking_from_text(text: str) -> Tuple[str, Optional[str]]:
    if not text or not isinstance(text, str):
        return text or "", None

    thinking_parts: List[str] = []
    cleaned = text
    for pattern in _THINKING_BLOCK_PATTERNS:
        for match in pattern.finditer(cleaned):
            chunk = match.group(1).strip()
            if chunk:
                thinking_parts.append(chunk)
        cleaned = pattern.sub("", cleaned)

    cleaned = cleaned.strip()
    thinking = "\n\n---\n\n".join(thinking_parts) if thinking_parts else None
    return cleaned, thinking


def reasoning_from_ai_message(msg: Union[AIMessage, AIMessageChunk]) -> Optional[str]:
    additional = getattr(msg, "additional_kwargs", None) or {}
    for key in (
        "reasoning",
        "reasoning_content",
        "thinking",
        "thought",
    ):
        val = additional.get(key)
        if val:
            return message_content_to_str(val)

    response_metadata = getattr(msg, "response_metadata", None) or {}
    for key in ("reasoning", "reasoning_content", "thinking"):
        val = response_metadata.get(key)
        if val:
            return message_content_to_str(val)

    return None


def _truncate(text: str, limit: int = 1200) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit] + "…"


def build_agent_steps(messages: List[Any]) -> List[AgentStep]:
    steps: List[AgentStep] = []
    if not messages:
        return steps

    for msg in messages:
        if isinstance(msg, ToolMessage):
            name = getattr(msg, "name", None) or "tool"
            detail = _truncate(message_content_to_str(msg.content))
            steps.append(
                AgentStep(type="tool_result", label=name, detail=detail or "(empty)")
            )
            continue

        if not isinstance(msg, AIMessage):
            continue

        api_reasoning = reasoning_from_ai_message(msg)
        if api_reasoning:
            steps.append(
                AgentStep(
                    type="reasoning",
                    label="Model reasoning",
                    detail=_truncate(api_reasoning, 4000),
                )
            )

        tool_calls = getattr(msg, "tool_calls", None) or []
        for tc in tool_calls:
            if isinstance(tc, dict):
                name = tc.get("name", "tool")
                args = tc.get("args", {})
            else:
                name = getattr(tc, "name", "tool")
                args = getattr(tc, "args", {})
            try:
                args_str = json.dumps(args, default=str)
            except TypeError:
                args_str = str(args)
            steps.append(
                AgentStep(
                    type="tool_call",
                    label=name,
                    detail=_truncate(args_str, 800),
                )
            )

        raw_text = message_content_to_str(msg.content)
        visible, inline_thinking = split_thinking_from_text(raw_text)
        if inline_thinking:
            steps.append(
                AgentStep(
                    type="reasoning",
                    label="Thinking",
                    detail=_truncate(inline_thinking, 4000),
                )
            )

        if tool_calls:
            continue

        stripped = visible.strip().strip("'\"")
        if stripped in AGENT_ROUTING_CHOICES:
            steps.append(
                AgentStep(type="routing", label="Route", detail=stripped)
            )
        elif visible.strip() and len(visible.strip()) <= 280:
            # Short non-tool replies (e.g. router) — surface as routing hint
            if any(
                choice in visible for choice in AGENT_ROUTING_CHOICES
            ):
                steps.append(
                    AgentStep(
                        type="routing",
                        label="Route",
                        detail=_truncate(visible.strip(), 280),
                    )
                )

    return steps


def merge_thinking(*parts: Optional[str]) -> Optional[str]:
    chunks = [p.strip() for p in parts if p and p.strip()]
    if not chunks:
        return None
    seen = set()
    unique: List[str] = []
    for chunk in chunks:
        if chunk in seen:
            continue
        seen.add(chunk)
        unique.append(chunk)
    return "\n\n---\n\n".join(unique)
