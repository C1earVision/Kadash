"""Stream agent runs as SSE-friendly events (thinking, tools, status)."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Callable, Dict, List, Optional

from langchain_core.messages import AIMessage, AIMessageChunk

from Utils.agent_trace import message_content_to_str, reasoning_from_ai_message
from Utils.request_context import QueryCancelScope
from Utils.think_stream import LiveThinkExtractor
from schemas.query_models import AgentStep

EmitFn = Callable[[str, Dict[str, Any]], Any]


def _chunk_reasoning_delta(chunk: Any) -> str:
    if isinstance(chunk, (AIMessage, AIMessageChunk)):
        text = reasoning_from_ai_message(chunk)
        if text:
            return text
    additional = getattr(chunk, "additional_kwargs", None) or {}
    for key in ("reasoning", "reasoning_content", "thinking", "thought"):
        val = additional.get(key)
        if val:
            return message_content_to_str(val)
    return ""


def _truncate_detail(text: str, limit: int = 1200) -> str:
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return text[:limit] + "…"


def _should_cancel(request, cancel_scope: Optional[QueryCancelScope]) -> bool:
    if cancel_scope is not None and cancel_scope.is_cancelled():
        return True
    return False


async def _check_cancelled(request, cancel_scope: Optional[QueryCancelScope]) -> None:
    if cancel_scope is not None and cancel_scope.is_cancelled():
        raise asyncio.CancelledError("Query cancelled")
    if request is not None and await request.is_disconnected():
        if cancel_scope is not None:
            cancel_scope.cancel()
        raise asyncio.CancelledError("Client disconnected")


async def stream_agent_run(
    agent,
    messages: dict,
    *,
    phase: str,
    emit: EmitFn,
    request=None,
    cancel_scope: Optional[QueryCancelScope] = None,
) -> List[Any]:
    """
    Run *agent* while emitting live events via *emit(event_type, payload)*.
    Returns the final message list from graph state.
    """
    think_extractor = LiveThinkExtractor()
    trace_messages: List[Any] = []
    last_status = ""
    last_reasoning_snapshot = ""

    async def _emit_status(text: str) -> None:
        nonlocal last_status
        if text and text != last_status:
            last_status = text
            await emit("status", {"phase": phase, "text": text})

    await _emit_status(f"Running {phase}…")

    async def _consume_events() -> None:
        nonlocal trace_messages, last_reasoning_snapshot
        async for event in agent.astream_events(messages, version="v2"):
            await _check_cancelled(request, cancel_scope)

            ev = event.get("event")
            data = event.get("data") or {}
            name = event.get("name") or ""

            if ev == "on_chat_model_start":
                await _emit_status(f"Model thinking ({phase})…")
                continue

            if ev == "on_chat_model_stream":
                chunk = data.get("chunk")
                if chunk is None:
                    continue
                reasoning = _chunk_reasoning_delta(chunk)
                if reasoning:
                    if reasoning.startswith(last_reasoning_snapshot):
                        reasoning_delta = reasoning[len(last_reasoning_snapshot) :]
                        last_reasoning_snapshot = reasoning
                    else:
                        reasoning_delta = reasoning
                        last_reasoning_snapshot += reasoning
                    if reasoning_delta:
                        await emit(
                            "thinking_delta",
                            {"text": reasoning_delta, "phase": phase},
                        )
                token_text = message_content_to_str(getattr(chunk, "content", ""))
                delta = think_extractor.feed(token_text)
                if delta:
                    await emit("thinking_delta", {"text": delta, "phase": phase})
                continue

            if ev == "on_tool_start":
                tool_input = data.get("input")
                detail = _truncate_detail(
                    json.dumps(tool_input, default=str)
                    if tool_input is not None
                    else ""
                )
                step = AgentStep(
                    type="tool_call",
                    label=name or "tool",
                    detail=detail or "(starting)",
                )
                await emit("step", {"step": step.model_dump(), "phase": phase})
                await _emit_status(f"Tool: {name or 'tool'}…")
                continue

            if ev == "on_tool_end":
                output = data.get("output")
                detail = _truncate_detail(message_content_to_str(output))
                step = AgentStep(
                    type="tool_result",
                    label=name or "tool",
                    detail=detail or "(empty)",
                )
                await emit("step", {"step": step.model_dump(), "phase": phase})
                continue

            if ev == "on_chain_end":
                output = data.get("output")
                if isinstance(output, dict) and output.get("messages"):
                    if len(output["messages"]) >= len(trace_messages):
                        trace_messages = list(output["messages"])

    stream_task = asyncio.create_task(_consume_events())
    try:
        await stream_task
    except asyncio.CancelledError:
        if cancel_scope is not None:
            cancel_scope.cancel()
        if not stream_task.done():
            stream_task.cancel()
            try:
                await stream_task
            except asyncio.CancelledError:
                pass
        if cancel_scope is not None:
            await cancel_scope.abort_http()
        raise
    except AttributeError:
        if _should_cancel(request, cancel_scope):
            raise asyncio.CancelledError("Query cancelled")
        output = await agent.ainvoke(messages)
        if isinstance(output, dict) and output.get("messages"):
            trace_messages = list(output["messages"])
        await emit(
            "status",
            {"phase": phase, "text": f"{phase} finished (non-streaming fallback)"},
        )

    if not trace_messages and not _should_cancel(request, cancel_scope):
        output = await agent.ainvoke(messages)
        if isinstance(output, dict) and output.get("messages"):
            trace_messages = list(output["messages"])

    return trace_messages
