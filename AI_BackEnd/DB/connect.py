import pyodbc
import os
from dotenv import load_dotenv


# Create the connection string

class dataBaseConnection:
    def __init__(self):
        load_dotenv()
        self.server = os.environ.get("DATABASE_SERVER")     
        self.database = os.environ.get("DATABASE_NAME")
        self.username = os.environ.get("DATABASE_USER_NAME")
        self.password = os.environ.get("DATABASE_PASS")

    def connection(self):
        conn = pyodbc.connect(
          f'DRIVER={{ODBC Driver 17 for SQL Server}};'
          f'SERVER={self.server};'
          f'DATABASE={self.database};'
          f'UID={self.username};'
          f'PWD={self.password}'
        )
        return conn


