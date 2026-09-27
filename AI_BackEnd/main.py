from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from DB.agent_visualizations import get_visualization
from Agent.AgenticWorkFlow import GeneralAgent, SearchAgent, RagAgent, CrudAgent, analysisAgent
from starlette.responses import JSONResponse
from Prompt.generalSysPrompt import GENERAL_SYSTEM_PROMPT
from Prompt.SearchSysPrompt import SEARCH_SYSTEM_PROMPT
from Prompt.RagSysPropmt import RAG_SYSTEM_PROMPT
from Prompt.dashboardSysPrompt import DASHBOARD_SYSTEM_PROMPT
from Prompt.analysisAgent import ANALYSIS_AGENT_SYSTEM_PROMPT
from dotenv import load_dotenv
from pydantic import BaseModel
import json
import re
import os
load_dotenv()

app = FastAPI()

origins = [
    "https://kadash-chi.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:9000",
    "http://127.0.0.1:9000",
    "http://localhost:9001",
    "http://127.0.0.1:9001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class QueryRequest(BaseModel):
    # userContext: str
    question: str
    admin: bool

def use_agent(messages, agent):
    output = agent.invoke(messages)

    if isinstance(output, dict) and "messages" in output:
        return output["messages"][-1].content
        
    else:
        return str(output)


def _normalize_image_url(image_url: str) -> str:
    image_url = image_url.strip()
    if image_url.startswith("/"):
        base = os.environ.get("AI_BACKEND_URL", "http://127.0.0.1:9000").rstrip("/")
        return f"{base}{image_url}"
    return image_url


def _extract_json_object(text):
    """Find the first balanced top-level JSON object in *text* using brace counting.
    Returns the parsed dict on success, or None on failure."""
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape_next = False

    for i in range(start, len(text)):
        ch = text[i]
        if escape_next:
            escape_next = False
            continue
        if ch == "\\":
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start : i + 1]
                try:
                    return json.loads(candidate, strict=False)
                except json.JSONDecodeError:
                    # This balanced block wasn't valid JSON; keep scanning
                    start = text.find("{", i + 1)
                    if start == -1:
                        return None
                    depth = 0
    return None


def parse_visualization_answer(raw_answer):
    print("PARSER FIX ACTIVE")

    if raw_answer is None:
        return None, None, None

    # --- Already a dict (tool returned structured output) ---
    if isinstance(raw_answer, dict):
        content = raw_answer.get("content") or raw_answer.get("answer") or ""
        image = raw_answer.get("image")
        dashboard = raw_answer.get("dashboard")
        norm_image = _normalize_image_url(str(image)) if image else None
        return content, norm_image, dashboard

    text = str(raw_answer).strip()

    # --- Strip markdown code fences (```json ... ```) ---
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```\s*$", "", text)
    text = text.strip()

    print("RAW TEXT BEING PARSED:", repr(text[:500]))

    # --- Attempt 1: Direct json.loads on the full text ---
    parsed = None
    try:
        parsed = json.loads(text, strict=False)
    except json.JSONDecodeError:
        pass

    # --- Attempt 2: Balanced-brace extraction ---
    if parsed is None:
        print("Direct parse failed, trying balanced-brace extraction")
        parsed = _extract_json_object(text)

    # --- Attempt 3: The LLM sometimes double-escapes newlines ---
    if parsed is None:
        try:
            cleaned = text.replace("\\n", "\n").replace("\\'", "'")
            parsed = json.loads(cleaned, strict=False)
        except json.JSONDecodeError:
            parsed = _extract_json_object(cleaned) if cleaned != text else None

    # --- Extract fields from the parsed dict ---
    if isinstance(parsed, dict):
        content = (
            parsed.get("content")
            or parsed.get("answer")
            or parsed.get("summary")
            or ""
        )
        image = parsed.get("image")
        dashboard = parsed.get("dashboard")

        # If there is no separate "dashboard" key but the top-level dict looks
        # like a dashboard spec itself (has "pages" or "title" + "charts"), treat
        # the whole thing as a dashboard.
        if dashboard is None and ("pages" in parsed or "charts" in parsed):
            dashboard = parsed
            # Use "content" we already extracted; if it was empty, synthesize one
            if not content:
                content = parsed.get("title", "Dashboard")

        norm_image = _normalize_image_url(str(image)) if image else None
        return content, norm_image, dashboard

    # --- All parsing failed; return the raw text as content ---
    print("All JSON parse attempts failed, returning raw text")
    return text, None, None





@app.get("/")
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI_BackEnd"}


@app.get("/visualizations/{visualization_id}")
async def get_visualization_image(visualization_id: str):
    image_bytes = get_visualization(visualization_id)
    if not image_bytes:
        raise HTTPException(status_code=404, detail="Visualization not found")
    return Response(content=image_bytes, media_type="image/png")


@app.options("/query")
async def options_query():
    return JSONResponse(status_code=200, content={"status": "ok"})

@app.post("/query")
async def query_travel_agent(query:QueryRequest):
    try:
        graph = GeneralAgent(system_prompt=GENERAL_SYSTEM_PROMPT)
        general_agent = graph()
        
        print(query)
        messages={
            "messages": [query.question]
            }
        agent_choice = use_agent(messages, general_agent)

        
        if agent_choice == "use_web_search_agent":
            print("Used web search agent")
            graph = SearchAgent(system_prompt=SEARCH_SYSTEM_PROMPT)
            search_agent = graph()
            final_answer = use_agent(messages, search_agent)
        elif agent_choice == "use_rag_agent":
            print("Used Rag Agent")
            graph = RagAgent(system_prompt=RAG_SYSTEM_PROMPT, model_provider='openai')
            rag_agent = graph()
            final_answer = use_agent(messages, rag_agent)
        elif agent_choice == 'use_crud_agent':
            if query.admin:
                print("Used CRUD Agent")
                graph = CrudAgent(system_prompt=DASHBOARD_SYSTEM_PROMPT, model_provider='openai')
                crud_agent = graph()
                final_answer = use_agent(messages, crud_agent)
            else:
                final_answer = "User has no access to this information"
        elif agent_choice == 'use_data_analysis_and_visualization_agent':
            if query.admin:
                print("data analysis and visualization agent used")
                graph = analysisAgent(system_prompt=ANALYSIS_AGENT_SYSTEM_PROMPT, model_provider="openai")
                analysis_agent = graph()
                final_answer = use_agent(messages, analysis_agent)
            else:
                final_answer = "User has no access to this information"
        print(final_answer)
        print("FINAL ANSWER FROM AGENT:", repr(final_answer))
        answer_text, image_url, dashboard_data = parse_visualization_answer(final_answer)
        payload = {"answer": answer_text, "agent": agent_choice}
        if image_url:
            payload["image"] = image_url
        if dashboard_data:
            payload["dashboard"] = dashboard_data
        return payload
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})