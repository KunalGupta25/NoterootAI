FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN useradd --create-home appuser && mkdir -p /data/chroma_db && chown -R appuser /app /data
USER appuser

EXPOSE 8000

CMD ["gunicorn", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "main:app"]
