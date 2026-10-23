"""Incremental extraction of model thinking from streamed LLM tokens."""

from __future__ import annotations

from typing import List, Tuple


class LiveThinkExtractor:
    """Emit thinking text as `` / `` blocks arrive token-by-token."""

    def __init__(self) -> None:
        self._buf = ""
        self._open_tags: Tuple[Tuple[str, str], ...] = (
            ("<" + "think" + ">", "</" + "think" + ">"),
            ("<" + "redacted_thinking" + ">", "</" + "redacted_thinking" + ">"),
        )
        # Per open-tag index: how much of the live (unclosed) inner text was already emitted
        self._live_emitted = 0

    def feed(self, chunk: str) -> str:
        if not chunk:
            return ""
        self._buf += chunk
        emitted: List[str] = []

        for open_tag, close_tag in self._open_tags:
            search_from = 0
            while True:
                start = self._buf.find(open_tag, search_from)
                if start == -1:
                    break
                inner_start = start + len(open_tag)
                end = self._buf.find(close_tag, inner_start)
                if end == -1:
                    inner = self._buf[inner_start:]
                    if len(inner) > self._live_emitted:
                        emitted.append(inner[self._live_emitted :])
                        self._live_emitted = len(inner)
                    break
                inner = self._buf[inner_start:end]
                if inner:
                    emitted.append(inner)
                self._live_emitted = 0
                search_from = end + len(close_tag)

        return "".join(emitted)
