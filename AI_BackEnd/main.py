from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Agent.AgenticWorkFlow import GeneralAgent, SearchAgent, RagAgent
from starlette.responses import JSONResponse
from Prompt.generalSysPrompt import GENERAL_SYSTEM_PROMPT
from Prompt.SearchSysPrompt import SEARCH_SYSTEM_PROMPT
from Prompt.RagSysPropmt import RAG_SYSTEM_PROMPT

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

def use_agent(messages, agent):
    output = agent.invoke(messages)

    if isinstance(output, dict) and "messages" in output:
        return output["messages"][-1].content
        
    else:
        return str(output)

@app.post("/query")
async def query_travel_agent(query:QueryRequest):
    try:
        graph = GeneralAgent(system_prompt=GENERAL_SYSTEM_PROMPT)
        general_agent = graph()
        

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
            graph = RagAgent(system_prompt=RAG_SYSTEM_PROMPT)
            rag_agent = graph()
            final_answer = use_agent(messages, rag_agent)
        
        return {"answer": final_answer, "agent": agent_choice}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})