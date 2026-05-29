FROM python:3.11-slim

WORKDIR /app

# Copy and install dependencies (paths relative to repo root = build context)
COPY ai-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY ai-service/ .

# Create chroma data directory
RUN mkdir -p /data/chroma_db

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
