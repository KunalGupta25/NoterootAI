FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "exec gunicorn --workers 1 --timeout 120 --graceful-timeout 20 --keep-alive 30 --worker-tmp-dir /dev/shm --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} main:app"]

