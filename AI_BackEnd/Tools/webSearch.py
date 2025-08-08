from langchain.tools import tool
from dotenv import load_dotenv
import os
from Utils.TavilySearch import TavilySearchTool



class webSearch:
  def __init__(self):
    load_dotenv()
    self.tavily_api_key = os.environ.get("TAVILY_API_KEY")
    self.tavily_search = TavilySearchTool()
    self.search_tool_list = self.setup_tool()


  def setup_tool(self):
      @tool
      def search(question: str) -> dict:
        """
        Use this tool to search the internet for real-time or recent information related to PC hardware or video games.
        You can answer questions about:
        - Any hardware related question
        - Game recommendations based on genres, preferences, or platforms
        - System requirements for specific games
        - Release dates and updates
        - Lists of games (e.g. best RPGs, popular multiplayer games, etc.)
        - Gaming consoles, platforms, and accessories
        - Esports, game developers, and gaming news
        - Tips, tricks, and gameplay help
        """
        try:
          search_result = self.tavily_search.tavily_search(question)
          return {"result":search_result}
        except Exception as e:
          print(e)
          return {"error": f"Google cannot find the details due to {e}. \nFollowing the question ${question}"} 
      return [search]