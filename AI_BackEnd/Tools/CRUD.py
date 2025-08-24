from langchain.tools import tool
from dotenv import load_dotenv
import os
from DB.connect import dataBaseConnection
from langchain_tavily import TavilySearch
import requests


class databaseCrudOperations:
    def __init__(self):
        load_dotenv()
        self.dataBaseCrudToolList = self.setup_tool()
        self.dataBaseConnection = dataBaseConnection()
        self.tavily_search_tool = TavilySearch(
          max_results=5,
          include_images=True,
          include_image_descriptions=False
        )

    def setup_tool(self):
        @tool
        def search_image(product_name: str) -> dict:
            """
            Search the internet for product images based on the product name.
            Returns up to 3 image URLs only.
            """
            try:
                result = self.tavily_search_tool.invoke({
                    "query": product_name,
                    "include_images": True,
                    "search_depth": "basic"
                })
                # print(f"result: {result}")
                if isinstance(result, dict) and "images" in result:
                    urls = []
                    for img in result["images"][:3]:
                        if isinstance(img, dict):
                            urls.append(img.get("url"))
                        elif isinstance(img, str):
                            urls.append(img)
                    # print(f"urls: {urls}")
                    return urls

                return []

            except Exception:
                return []





        @tool
        def CRUD(query: list) -> dict:
          """
          Handle Create operation for the Product table 
          by forwarding structured API-style requests to the backend service 
          that executes the corresponding SQL queries.

          This function does not generate or execute SQL directly. 
          Instead, it takes a structured request dictionary, sends it to the 
          appropriate API endpoint/tool, and returns the API response.

          Parameters
          ----------
          query : list
              A structured request in the following format:
              [
                {
                  "name": str,
                  "brand": str,
                  "desc": str,
                  "price": int,
                  "rating": int (optional, default=0),
                  "sq": int, -> stock quantity
                  "category": str,
                  "releaseDate": str (YYYY-MM-DD),
                  "imgs": list of urls (it has to be image urls not any place holder value)             
                },
                headers = {
                  "Authorization": f"Bearer {token}",
                  "Content-Type": "application/json"
                }
              ]

          Returns
          -------
          dict
              A dictionary containing the result of the operation. Example formats:
              
              On success:
              {
                "status": "success",
                "message": "Product added successfully",
              }

              On failure:
              {
                "status": "error",
                "message": "<error details>"
              }
          """


          try:
              print("Crud functinon used")
              print(query)
              api_url = os.environ.get("API_URL")
              print(api_url)
              response = requests.post(api_url+"/user/admin", json=query[0], headers=query[1]['headers'], timeout=10)
              print(f"response: {response}")
              if response.status_code >= 400:
                  try:
                      error_details = response.json()
                  except ValueError:
                      error_details = response.text  # fallback if not JSON
                  return error_details
                  
              return "Product added successfully"
          except requests.exceptions.RequestException as e:
              print(f"error: {e}")
              return str(e)


        return [CRUD, search_image]

