from fastapi import FastAPI, HTTPException, UploadFile, File
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
from typing import Optional, List
import json
import re
import os
import time
from Utils.ModelLoader import is_rate_limit_error, extract_retry_delay
from DB.DataSourceManager import data_source_manager
load_dotenv()
# AI Backend server entrypoint
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


class ConnectDbRequest(BaseModel):
    connection_string: str
    custom_name: Optional[str] = None


class QueryRequest(BaseModel):
    question: str
    admin: bool
    source_id: Optional[str] = None

def use_agent(messages, agent, max_retries=2):
    for attempt in range(max_retries):
        try:
            output = agent.invoke(messages)

            if isinstance(output, dict) and "messages" in output:
                return output["messages"][-1].content
            else:
                return str(output)
        except Exception as e:
            if is_rate_limit_error(e) and attempt < max_retries - 1:
                delay = extract_retry_delay(e, attempt + 1)
                print(f"[use_agent] Rate limit encountered during agent invocation. Retrying in {delay:.2f}s (attempt {attempt + 1}/{max_retries})...")
                time.sleep(delay)
            else:
                raise


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


def _clean_dashboard_content(content: str) -> str:
    """
    Cleans text content accompanying an interactive dashboard so the user is only presented
    with Key Takeaways and Recommendations, completely stripping out redundant dashboard
    specifications, page overviews, visual descriptions, schema chatter, and conversational filler.
    """
    if not content or not isinstance(content, str):
        return ""

    text = content.strip()

    # 1. If text has a Key Takeaways header, discard any introductory chatter or dashboard specs preceding it
    takeaways_match = re.search(
        r"(?:^|\n)(#{1,4}\s*Key Takeaways|\*\*Key Takeaways\*\*)",
        text,
        re.IGNORECASE,
    )
    if takeaways_match:
        text = text[takeaways_match.start():].strip()

    # 2. Strip sections dedicated to dashboard structure, visuals, or page listings
    unwanted_section_patterns = [
        r"(?i)#{1,4}\s*(?:Dashboard Overview|Dashboard Structure|Report Structure|Visualizations?|Dashboard Pages?|Pages? Breakdown|Report Pages?|Report Overview|Overview of the Dashboard).*?(?=(?:\n#{1,4}|\Z))",
        # Bullet points describing pages: e.g. "- **Page 1: Executive Overview**..."
        r"(?i)(?:^|\n)[*-]?\s*\**Page \d+[:\s\*\-].*?(?=(?:\n[*-]|\n#{1,4}|\Z))",
        # Bullet points describing charts: e.g. "- **Chart 1: Area Chart**..."
        r"(?i)(?:^|\n)[*-]?\s*\**(?:Chart|Visual)\s*\d+[:\s\*\-].*?(?=(?:\n[*-]|\n#{1,4}|\Z))",
    ]
    for pat in unwanted_section_patterns:
        text = re.sub(pat, "\n", text, flags=re.DOTALL)

    # 3. Strip individual sentences that describe generating the dashboard or visual specs
    unwanted_sentence_patterns = [
        r"(?i)(?:^|\n)\s*(?:Here is the (?:interactive )?dashboard|Below is the (?:interactive )?dashboard|The (?:interactive )?dashboard below|This dashboard (?:features|consists of|contains|provides|includes|is structured)|We have generated a (?:multi-page )?dashboard|In this report, we present|The report is organized into).*?(?:\.|\n)",
        r"(?i)(?:^|\n)\s*(?:We queried the (?:database|tables?)|Using SQL aggregations?|The data was retrieved from|Through dynamic database discovery).*?(?:\.|\n)",
    ]
    for pat in unwanted_sentence_patterns:
        text = re.sub(pat, "\n", text)

    # 4. Clean up excess whitespace
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def parse_visualization_answer(raw_answer):
    print("PARSER FIX ACTIVE")

    if raw_answer is None:
        return None, None, None

    # --- Already a dict (tool returned structured output) ---
    if isinstance(raw_answer, dict):
        content = raw_answer.get("content") or raw_answer.get("answer") or ""
        image = raw_answer.get("image")
        dashboard = raw_answer.get("dashboard")
        if dashboard:
            content = _clean_dashboard_content(content)
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

        if dashboard:
            content = _clean_dashboard_content(content)

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


# Data source registration and schema introspection endpoints
@app.post("/data-sources/connect")
async def connect_database(request: ConnectDbRequest):
    try:
        result = data_source_manager.register_database_connection(
            request.connection_string, request.custom_name
        )
        return {"status": "ok", "data_source": result}
    except Exception as e:
        return JSONResponse(status_code=400, content={"status": "error", "error": str(e)})


@app.post("/data-sources/upload")
async def upload_data_files(files: List[UploadFile] = File(...)):
    try:
        files_data = []
        for file in files:
            content = await file.read()
            files_data.append({"filename": file.filename, "content": content})

        result = data_source_manager.register_uploaded_files(files_data)
        return {"status": "ok", "data_source": result}
    except Exception as e:
        return JSONResponse(status_code=400, content={"status": "error", "error": str(e)})


@app.get("/data-sources/active")
async def get_active_data_sources():
    sources_summary = []
    for s_id, s in data_source_manager.sources.items():
        sources_summary.append({
            "source_id": s_id,
            "name": s["name"],
            "type": s["type"],
            "tables": s["tables"],
        })
    default_db = data_source_manager.get_default_db()
    if default_db:
        sources_summary.insert(0, {
            "source_id": "default",
            "name": "Default Database",
            "type": "database",
            "tables": default_db.get_usable_table_names(),
        })
    return {"status": "ok", "data_sources": sources_summary}


@app.get("/data-sources/{source_id}/schema")
async def get_data_source_schema(source_id: str, limit: int = 15):
    schema_info = data_source_manager.get_schema(source_id, limit=limit)
    return {"status": "ok", "schema": schema_info}


@app.get("/data-sources/{source_id}/tables/{table_name}")
async def get_table_records(source_id: str, table_name: str, limit: int = 25):
    records = data_source_manager.get_table_data(source_id, table_name, limit=limit)
    return {"status": "ok", "table": table_name, "data": records}


@app.options("/query")
async def options_query():
    return JSONResponse(status_code=200, content={"status": "ok"})


@app.post("/query")
async def query_travel_agent(query: QueryRequest):
    try:
        # Resolve active dynamic data source
        active_source = data_source_manager.get_source(query.source_id)
        active_db = active_source["db"] if active_source else None

        graph = GeneralAgent(system_prompt=GENERAL_SYSTEM_PROMPT)
        general_agent = graph()

        print(f"Query: {query.question} | Source: {active_source.get('name') if active_source else 'default'}")
        messages = {
            "messages": [query.question]
        }
        agent_choice = use_agent(messages, general_agent)

        if agent_choice == "use_web_search_agent":
            print("Used web search agent")
            graph = SearchAgent(system_prompt=SEARCH_SYSTEM_PROMPT)
            search_agent = graph()
            final_answer = use_agent(messages, search_agent)
        elif agent_choice == "use_rag_agent":
            print(f"Used Rag Agent with active db: {active_source.get('name') if active_source else 'default'}")
            graph = RagAgent(system_prompt=RAG_SYSTEM_PROMPT, model_provider='openai', db=active_db)
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
                print(f"data analysis and visualization agent used with active db: {active_source.get('name') if active_source else 'default'}")
                graph = analysisAgent(system_prompt=ANALYSIS_AGENT_SYSTEM_PROMPT, model_provider="openai", db=active_db)
                analysis_agent = graph()
                final_answer = use_agent(messages, analysis_agent)
            else:
                final_answer = "User has no access to this information"

        print("FINAL ANSWER FROM AGENT:", repr(final_answer))
        answer_text, image_url, dashboard_data = parse_visualization_answer(final_answer)
        payload = {
            "answer": answer_text,
            "agent": agent_choice,
            "source_id": active_source["source_id"] if active_source else "default",
            "source_name": active_source["name"] if active_source else "Default Database"
        }
        if image_url:
            payload["image"] = image_url
        if dashboard_data:
            payload["dashboard"] = dashboard_data
        return payload
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})