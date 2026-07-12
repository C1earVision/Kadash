import os
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from urllib.parse import quote_plus

class dataBaseConnection:
    def __init__(self):
        load_dotenv()
        self.server = os.environ.get("DATABASE_SERVER")     
        self.database = os.environ.get("DATABASE_NAME")
        self.username = os.environ.get("DATABASE_USER_NAME")
        self.password = os.environ.get("DATABASE_PASS")
        self.port = os.environ.get("DATABASE_PORT", "5432")

    def connection(self):
        use_ssl = (
            os.environ.get("DATABASE_SSL", "").lower() == "true"
            or (self.server and "supabase" in self.server)
        )
        ssl_param = "?sslmode=require" if use_ssl else ""
        connection_string = (
            f"postgresql+psycopg2://{self.username}:{quote_plus(self.password)}@{self.server}:{self.port}/{self.database}{ssl_param}"
        )

        try:
            db = SQLDatabase.from_uri(connection_string)
            print("Successfully connected to PostgreSQL database.")
        except Exception as e:
            print(f"Failed to connect to the database: {e}")
            db = None
        return db
