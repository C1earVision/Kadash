import pyodbc
import os
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from urllib.parse import quote_plus
# Create the connection string

class dataBaseConnection:
    def __init__(self):
        load_dotenv()
        self.server = os.environ.get("DATABASE_SERVER")     
        self.database = os.environ.get("DATABASE_NAME")
        self.username = os.environ.get("DATABASE_USER_NAME")
        self.password = os.environ.get("DATABASE_PASS")

    def connection(self):
        connection_string = (
            f"mssql+pyodbc://{self.username}:{quote_plus(self.password)}@{self.server}/{self.database}"
            "?driver=ODBC+Driver+17+for+SQL+Server"
        )

        try:
            db = SQLDatabase.from_uri(connection_string)
            print("✅ Successfully connected to the database.")
        except Exception as e:
            print(f"❌ Failed to connect to the database: {e}")
            db = None
        return db


