from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Agent.AgenticWorkFlow import GeneralAgent, SearchAgent, RagAgent, CrudAgent, analysisAgent
from starlette.responses import JSONResponse
from Prompt.generalSysPrompt import GENERAL_SYSTEM_PROMPT
from Prompt.SearchSysPrompt import SEARCH_SYSTEM_PROMPT
from Prompt.RagSysPropmt import RAG_SYSTEM_PROMPT
from Prompt.dashboardSysPrompt import DASHBOARD_SYSTEM_PROMPT
from Prompt.analysisAgent import ANALYSIS_AGENT_SYSTEM_PROMPT
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel
import os
load_dotenv()

app = FastAPI()

origins = [
    "https://kadash-chi.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:9000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
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


os.makedirs("tmp", exist_ok=True)
app.mount("/static", StaticFiles(directory="tmp"), name="static")

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
        return {"answer": final_answer, "agent": agent_choice}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})