from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv
import yaml



class modelLoader():
  def __init__(self, model_provider):
     self.model_provider = model_provider
     with open("Model/config.yaml", "r") as file:
        self.config = yaml.safe_load(file)
  def load_llm(self):
    """
    Load and return the LLM model.
    """
    print("LLM loading...")
    print(f"Loading model from provider: {self.model_provider}")
    # if self.model_provider == "groq":
    print("Loading LLM from Groq..............")
    groq_api_key = os.getenv("GROQ_API_KEY")
    model_name = self.config["llm"][self.model_provider]["model_name"]
    print(f"Model Name: {model_name}")
    llm=ChatGroq(model=model_name, api_key=groq_api_key)
    
    
    return llm