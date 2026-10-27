# Imagen única de StatsLine (ADR-0003 y ADR-0006): construye React y lo sirve con FastAPI.

# 1. Build del frontend
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 2. Backend con el build de React adentro
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DIRECTORIO_FRONTEND=/app/frontend/dist \
    ENTORNO=produccion
WORKDIR /app/backend
COPY backend/pyproject.toml backend/alembic.ini ./
COPY backend/app ./app
COPY backend/semillas ./semillas
COPY backend/migraciones ./migraciones
RUN pip install .
COPY --from=frontend /frontend/dist /app/frontend/dist

RUN useradd --create-home statsline
USER statsline

EXPOSE 8000
# Railway define PORT. Las migraciones corren antes, en el preDeployCommand (railway.toml).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
