# Dynamic Data Source Manager
# Manages external database connections and uploaded file databases (CSV/Excel via DuckDB).

import os
import re
import uuid
import base64
import duckdb
import pandas as pd
from typing import Dict, Any, Optional, List
from langchain_community.utilities import SQLDatabase
from DB.connect import dataBaseConnection


class DataSourceManager:
    """Manages active relational and file-backed SQL data sources for the analytics agents."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataSourceManager, cls).__new__(cls)
            cls._instance._init_manager()
        return cls._instance

    def _init_manager(self):
        self.sources: Dict[str, Dict[str, Any]] = {}
        self.storage_dir = os.path.join(os.path.dirname(__file__), "../storage/sessions")
        os.makedirs(self.storage_dir, exist_ok=True)
        self.default_db_conn = dataBaseConnection()
        self._default_db_instance = None

    def get_default_db(self) -> Optional[SQLDatabase]:
        if self._default_db_instance is None:
            self._default_db_instance = self.default_db_conn.connection()
        return self._default_db_instance

    def register_database_connection(self, connection_url: str, custom_name: Optional[str] = None) -> Dict[str, Any]:
        raw_url = connection_url.strip()

        # Normalize postgres URLs for SQLAlchemy psycopg2 driver
        if raw_url.startswith("postgres://"):
            raw_url = raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
            raw_url = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)

        db = SQLDatabase.from_uri(raw_url)
        table_names = db.get_usable_table_names()

        source_id = f"db_{uuid.uuid4().hex[:8]}"
        display_name = custom_name or self._extract_db_name(raw_url)

        schema_meta = self._inspect_database_schema(db, table_names)

        source_record = {
            "source_id": source_id,
            "name": display_name,
            "type": "database",
            "db": db,
            "tables": table_names,
            "schema": schema_meta,
        }
        self.sources[source_id] = source_record
        return {
            "source_id": source_id,
            "name": display_name,
            "type": "database",
            "tables": table_names,
            "schema": schema_meta,
        }

    def register_uploaded_files(self, files: List[Dict[str, Any]], custom_name: Optional[str] = None) -> Dict[str, Any]:
        source_id = f"file_{uuid.uuid4().hex[:8]}"
        db_path = os.path.join(self.storage_dir, f"{source_id}.duckdb")
        con = duckdb.connect(db_path)

        table_names = []
        for file_info in files:
            filename = file_info["filename"]
            content = file_info["content"]
            base_name, ext = os.path.splitext(filename)
            clean_name = self._sanitize_table_name(base_name)

            if ext.lower() in [".csv", ".txt"]:
                temp_file = os.path.join(self.storage_dir, f"{source_id}_{filename}")
                with open(temp_file, "wb") as f:
                    f.write(content)
                con.execute(f"CREATE TABLE \"{clean_name}\" AS SELECT * FROM read_csv_auto('{temp_file.replace(chr(92), '/')}')")
                table_names.append(clean_name)
                try:
                    os.remove(temp_file)
                except Exception:
                    pass

            elif ext.lower() in [".xlsx", ".xls"]:
                temp_file = os.path.join(self.storage_dir, f"{source_id}_{filename}")
                with open(temp_file, "wb") as f:
                    f.write(content)
                excel_dict = pd.read_excel(temp_file, sheet_name=None)
                for sheet_name, df in excel_dict.items():
                    sheet_table = self._sanitize_table_name(f"{clean_name}_{sheet_name}" if len(excel_dict) > 1 else clean_name)
                    con.register("temp_df", df)
                    con.execute(f"CREATE TABLE \"{sheet_table}\" AS SELECT * FROM temp_df")
                    con.unregister("temp_df")
                    table_names.append(sheet_table)
                try:
                    os.remove(temp_file)
                except Exception:
                    pass

        con.close()

        # Connect through LangChain SQLDatabase
        db = SQLDatabase.from_uri(f"duckdb:///{db_path.replace(chr(92), '/')}")
        display_name = custom_name or (files[0]["filename"] if files else "Uploaded Dataset")
        schema_meta = self._inspect_database_schema(db, table_names)

        source_record = {
            "source_id": source_id,
            "name": display_name,
            "type": "file",
            "db": db,
            "tables": table_names,
            "schema": schema_meta,
        }
        self.sources[source_id] = source_record
        return {
            "source_id": source_id,
            "name": display_name,
            "type": "file",
            "tables": table_names,
            "schema": schema_meta,
        }

    def get_source(self, source_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if source_id and source_id in self.sources:
            return self.sources[source_id]
        
        # Fall back to default DB
        default_db = self.get_default_db()
        if default_db:
            tables = default_db.get_usable_table_names()
            return {
                "source_id": "default",
                "name": "Default Database",
                "type": "database",
                "db": default_db,
                "tables": tables,
                "schema": {},
            }
        return None

    # Convert database cell values to JSON serializable formats, encoding binary images to base64 data URLs
    def _serialize_cell_value(self, val: Any) -> Any:
        if val is None:
            return ""
        if isinstance(val, (bytes, memoryview)):
            raw_b = bytes(val)
            if raw_b.startswith(b"\x89PNG"):
                mime = "image/png"
            elif raw_b.startswith(b"\xff\xd8\xff"):
                mime = "image/jpeg"
            elif raw_b.startswith(b"GIF"):
                mime = "image/gif"
            elif raw_b.startswith(b"RIFF") and b"WEBP" in raw_b[:12]:
                mime = "image/webp"
            else:
                mime = "image/png"
            return f"data:{mime};base64,{base64.b64encode(raw_b).decode('utf-8')}"
        return str(val)

    def get_schema(self, source_id: Optional[str] = None, limit: int = 15) -> Dict[str, Any]:
        source = self.get_source(source_id)
        if not source:
            return {"tables": [], "columns": {}, "previews": {}}

        db = source["db"]
        tables = source.get("tables") or db.get_usable_table_names()
        return self._inspect_database_schema(db, tables, limit=limit)

    # Fetch table records with configurable row limit
    def get_table_data(self, source_id: Optional[str], table_name: str, limit: int = 25) -> Dict[str, Any]:
        source = self.get_source(source_id)
        if not source:
            return {"columns": [], "rows": [], "total": 0}
        db = source["db"]
        from sqlalchemy import text
        structured = {"columns": [], "rows": [], "total": 0}
        try:
            with db._engine.connect() as conn:
                try:
                    res = conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT {int(limit)}'))
                except Exception:
                    res = conn.execute(text(f'SELECT * FROM {table_name} LIMIT {int(limit)}'))
                cols = list(res.keys())
                raw_rows = res.fetchall()
                rows = [
                    {c: self._serialize_cell_value(v) for c, v in zip(cols, row)}
                    for row in raw_rows
                ]
                structured = {"columns": cols, "rows": rows, "total": len(rows)}
        except Exception as e:
            structured = {"columns": [], "rows": [], "total": 0, "error": str(e)}
        return structured

    # Introspect table schemas, DDL definitions, and sample records
    def _inspect_database_schema(self, db: SQLDatabase, table_names: List[str], limit: int = 15) -> Dict[str, Any]:
        from sqlalchemy import text
        result = {"tables": table_names, "columns": {}, "previews": {}}
        for tbl in table_names:
            structured_preview = {"columns": [], "rows": []}
            try:
                with db._engine.connect() as conn:
                    try:
                        res = conn.execute(text(f'SELECT * FROM "{tbl}" LIMIT {int(limit)}'))
                    except Exception:
                        res = conn.execute(text(f'SELECT * FROM {tbl} LIMIT {int(limit)}'))
                    cols = list(res.keys())
                    raw_rows = res.fetchall()
                    rows = [
                        {c: self._serialize_cell_value(v) for c, v in zip(cols, row)}
                        for row in raw_rows
                    ]
                    structured_preview = {"columns": cols, "rows": rows}
            except Exception:
                try:
                    raw_str = db.run(f'SELECT * FROM "{tbl}" LIMIT {int(limit)}')
                    structured_preview = {"columns": [], "rows": [], "raw": str(raw_str)}
                except Exception:
                    structured_preview = {"columns": [], "rows": []}

            result["previews"][tbl] = structured_preview

            try:
                table_info = db.get_table_info([tbl])
                result["columns"][tbl] = table_info
            except Exception:
                result["columns"][tbl] = ""

        return result

    def _sanitize_table_name(self, name: str) -> str:
        clean = re.sub(r"[^\w]+", "_", name.strip())
        return clean.strip("_") or "data_table"

    def _extract_db_name(self, url: str) -> str:
        try:
            return url.rsplit("/", 1)[-1].split("?")[0]
        except Exception:
            return "Remote Database"


data_source_manager = DataSourceManager()
