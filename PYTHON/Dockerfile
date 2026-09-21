# ShushrutAI AI server: FastAPI + ONNX Runtime + Gemini/Sarvam.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# Dependencies first, so code edits don't re-run pip.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Non-root. Credentials are bind-mounted read-only by docker-compose, never
# baked into the image.
RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/', timeout=4)" || exit 1

# Same command as Render. --timeout must exceed the Gemini budget + Sarvam
# fallback (~170s), or gunicorn kills the worker mid-request.
CMD ["sh", "-c", "exec gunicorn main:app --bind 0.0.0.0:${PORT} -w 1 -k uvicorn.workers.UvicornWorker --timeout 180"]
