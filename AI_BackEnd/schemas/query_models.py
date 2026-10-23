"""Strict response contracts for /query — shared shape with the frontend."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class ChartDataKey(BaseModel):
    model_config = ConfigDict(extra="allow")

    key: str
    name: Optional[str] = None
    color: Optional[str] = None


class DashboardChart(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = "bar"
    xAxisKey: Optional[str] = None
    dataKeys: Optional[List[ChartDataKey]] = None
    data: Optional[List[Dict[str, Any]]] = None


class DashboardKpi(BaseModel):
    model_config = ConfigDict(extra="allow")

    label: str
    value: str
    change: Optional[str] = None
    description: Optional[str] = None


class DashboardSlider(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    label: str
    filterKey: str
    sliderMin: float
    sliderMax: float
    sliderStep: Optional[float] = None
    defaultValue: Optional[float] = None
    sliderUnit: Optional[str] = None
    targetScope: Optional[str] = "page"
    targetChartIds: Optional[List[str]] = None
    operator: Optional[str] = ">="
    description: Optional[str] = None


class DashboardPage(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = None
    name: Optional[str] = None
    icon: Optional[str] = None
    summary: Optional[str] = None
    insights: Optional[List[str]] = None
    kpis: Optional[List[DashboardKpi]] = None
    charts: Optional[List[DashboardChart]] = None
    sliders: Optional[List[DashboardSlider]] = None


class DashboardSpec(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: Optional[str] = None
    subtitle: Optional[str] = None
    pages: Optional[List[DashboardPage]] = None
    charts: Optional[List[DashboardChart]] = None
    kpis: Optional[List[DashboardKpi]] = None
    insights: Optional[List[str]] = None
    sliders: Optional[List[DashboardSlider]] = None
    global_sliders: Optional[List[DashboardSlider]] = None


class AgentStep(BaseModel):
    type: Literal["tool_call", "tool_result", "reasoning", "routing"]
    label: str
    detail: str


class ParsedAgentPayload(BaseModel):
    """Normalized agent output before building the HTTP response."""

    answer: str = ""
    image: Optional[str] = None
    dashboard: Optional[DashboardSpec] = None
    thinking: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    agent: Optional[str] = None
    image: Optional[str] = None
    dashboard: Optional[DashboardSpec] = None
    thinking: Optional[str] = None
    steps: List[AgentStep] = Field(default_factory=list)
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    source_fallback: Optional[bool] = Field(
        default=None,
        description="True when the requested source_id was unavailable and the default DB was used",
    )
    source_requested_id: Optional[str] = Field(
        default=None,
        description="Original source_id from the client when source_fallback is true",
    )


def coerce_dashboard(raw: Any) -> Optional[DashboardSpec]:
    if raw is None:
        return None
    if isinstance(raw, DashboardSpec):
        return raw
    if not isinstance(raw, dict):
        return None
    try:
        return DashboardSpec.model_validate(raw)
    except Exception:
        return DashboardSpec.model_construct(**raw)
