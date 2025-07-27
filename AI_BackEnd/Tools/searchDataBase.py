from langchain.tools import tool
from dotenv import load_dotenv
import os
from DB.connect import dataBaseConnection


class DataBaseSearch:
    def __init__(self):
        load_dotenv()
        self.dataBaseSearchToolList = self.setup_tool()
        self.dataBaseConnection = dataBaseConnection()

    def setup_tool(self):
        @tool
        def dataBaseSearch(query: str) -> dict:
            """
            Translates a natural language question into an SQL query that targets the 'Product' table,
            sends it to the database API for execution, and returns the result.

            The only accessible table is:

            Product(
              ProductId INT IDENTITY(1,1) PRIMARY KEY,
              [Name] varchar(100) UNIQUE NOT NULL,
              Brand varchar(100) NOT NULL,
              [Description] varchar(1000) NOT NULL,
              Price INT,
              Rating INT DEFAULT 0,
              StockQuantity INT,
              Category VARCHAR(100) CHECK (Category IN ('GPU', 'CPU', 'STORAGE','MEMORY','MOTHERBOARD','CPU COOLER','POWER SUPPLY','CASE')),
              ReleaseDate DATE NOT NULL,
            );

            Example questions this tool can handle:
            - "Do you have an rtx 2050 in stock?"
            - "what is the price for the gtx 1050ti"
            - "Do you have any CPUs in the range of 500?"

            Parameters:
            ----------
            query : str
                An sql query.

            Returns:
            -------
            dict
                A list containing the results of the SQL query executed by the tool.
            If the tool return an empty list then there are no products matching the query.
            """
            try:
                print(query)
                conn = self.dataBaseConnection.connection()
                cursor = conn.cursor()
                cursor.execute(query)
                result = cursor.fetchall()
                print(result)
                return {"result": result}

            except Exception as e:
                print(f"An error occurred while executing the query: {e}")
                return {"error": str(e)}

            finally:
                try:
                    conn.close()
                except:
                    pass


        return [dataBaseSearch]
