FROM python:3.11

RUN useradd -m -u 1000 user

WORKDIR /app

ENV PIP_NO_CACHE_DIR=1 \
    PIP_PREFER_BINARY=1

COPY --chown=user backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --prefer-binary -r backend/requirements.txt

COPY --chown=user data/ ./data/
COPY --chown=user backend/ ./backend/
COPY --chown=user frontend/data/ ./frontend/data/

WORKDIR /app/backend

ENV PORT=7860
EXPOSE 7860

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
