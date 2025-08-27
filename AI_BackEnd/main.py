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
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # set specific origins in prod
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


app.mount("/static", StaticFiles(directory="tmp"), name="static")
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