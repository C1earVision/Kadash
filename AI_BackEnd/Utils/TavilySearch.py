import os
import json
from langchain_tavily import TavilySearch



class TavilySearchTool:
    def __init__(self):
        pass

    def tavily_search(self, question: str) -> dict:
        print(f"🔍 Invoked search tool with question: {question}")
        tavily_tool = TavilySearch(topic="general", include_answer="advanced")
        result = tavily_tool.invoke({"query": question})
        if isinstance(result, dict) and result.get("answer"):
            return result["answer"]
        return result