# ---- Render Deployment Dockerfile for AI Backend ----
FROM python:3.11-slim

# Install system dependencies needed for psycopg2-binary and other libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install first (layer cache optimization)
COPY req.txt .
RUN pip install --no-cache-dir -r req.txt

# Copy source code
COPY . .

# Expose the port FastAPI/uvicorn will run on
EXPOSE 8000

# Start the FastAPI app with uvicorn
# Render sets the PORT env var; fall back to 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
