from Utils.ModelLoader import modelLoader
from langgraph.graph import StateGraph, MessagesState, END, START
from langgraph.prebuilt import ToolNode, tools_condition
from Tools.webSearch import webSearch
from Tools.searchDataBase import DataBaseSearch



class GeneralAgent():
  def __init__(self, system_prompt, model_provider: str = "groq"):
          self.model_loader = modelLoader(model_provider=model_provider)
          self.llm = self.model_loader.load_llm()
          
          self.graph = None
          
          self.system_prompt = system_prompt
        
      
  def agent_function(self,state: MessagesState):
      """Main agent function"""
      user_question = state["messages"]
      input_question = [self.system_prompt] + user_question
      response = self.llm.invoke(input_question)
      return {"messages": [response]}
  
  def build_graph(self, has_tools: bool):
      graph_builder=StateGraph(MessagesState)
      graph_builder.add_node("agent", self.agent_function)
      graph_builder.add_edge(START,"agent")
      if has_tools:
        graph_builder.add_node("tools", ToolNode(tools=self.tools))
        graph_builder.add_conditional_edges("agent",tools_condition)
        graph_builder.add_edge("tools","agent")
        graph_builder.add_edge("tools",END)
      else:
        graph_builder.add_edge("agent",END)
      self.graph = graph_builder.compile()
      return self.graph
      
  def __call__(self):
      return self.build_graph(False)
  

class SearchAgent(GeneralAgent):
    def __init__(self, system_prompt, model_provider = "groq"):
        super().__init__(system_prompt, model_provider)
        self.web_search = webSearch()
        self.tools = []
        self.tools.extend([*self.web_search.search_tool_list])
        self.llm = self.llm.bind_tools(tools=self.tools)

    def __call__(self):
      return self.build_graph(True)
    

class RagAgent(GeneralAgent):
    def __init__(self, system_prompt, model_provider = "groq"):
        super().__init__(system_prompt, model_provider)
        self.dataBaseSearch = DataBaseSearch()
        self.web_search = webSearch()
        self.tools = []
        self.tools.extend([*self.dataBaseSearch.dataBaseSearchToolList,
                           *self.web_search.search_tool_list])
        self.llm = self.llm.bind_tools(tools=self.tools)

    def __call__(self):
      return self.build_graph(True)

