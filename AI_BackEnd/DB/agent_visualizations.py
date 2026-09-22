import os
import uuid
from urllib.parse import quote_plus

import psycopg2
from dotenv import load_dotenv


def _connection_params():
    load_dotenv()
    server = os.environ.get("DATABASE_SERVER")
    database = os.environ.get("DATABASE_NAME")
    username = os.environ.get("DATABASE_USER_NAME")
    password = os.environ.get("DATABASE_PASS")
    port = os.environ.get("DATABASE_PORT", "5432")
    use_ssl = (
        os.environ.get("DATABASE_SSL", "").lower() == "true"
        or (server and "supabase" in server)
    )
    return {
        "host": server,
        "port": port,
        "dbname": database,
        "user": username,
        "password": password,
        "sslmode": "require" if use_ssl else "prefer",
    }


def save_visualization(image_bytes: bytes, visualization_id: str | None = None) -> str:
    vid = visualization_id or str(uuid.uuid4())
    params = _connection_params()
    with psycopg2.connect(**params) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "AgentVisualization" ("VisualizationId", "Img")
                VALUES (%s::uuid, %s)
                ON CONFLICT ("VisualizationId") DO UPDATE SET "Img" = EXCLUDED."Img"
                """,
                (vid, psycopg2.Binary(image_bytes)),
            )
        conn.commit()
    return vid


def get_visualization(visualization_id: str) -> bytes | None:
    params = _connection_params()
    with psycopg2.connect(**params) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT "Img" FROM "AgentVisualization"
                WHERE "VisualizationId" = %s::uuid
                """,
                (visualization_id,),
            )
            row = cur.fetchone()
    if not row:
        return None
    return bytes(row[0])
