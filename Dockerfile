# syntax=docker/dockerfile:1

# --- Stage 1: build the React SPA ------------------------------------------
FROM node:20-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python backend + bundled SPA ---------------------------------
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY run.py ./
COPY seed.py ./
# Serve the compiled frontend from Flask (single-container deployment).
COPY --from=frontend /frontend/dist ./frontend/dist

# Ensure the default SQLite volume path exists even without a mounted volume.
RUN mkdir -p /data

EXPOSE 5000
CMD ["gunicorn", "-b", "0.0.0.0:5000", "-w", "2", "run:app"]
