# SETUP.md

> Se completa con los comandos reales al cerrar INF-001. Esto es lo esperado.

## Requisitos
- Python 3.12
- Node 20 LTS
- Docker y Docker Compose (para MySQL 8)
- Una clave de API-Football (plan Pro) para sincronizar. Para los tests no hace falta.

## Variables de entorno (`backend/.env`, a partir de `.env.example`)

```
DATABASE_URL=mysql+pymysql://statsline:statsline@localhost:3306/statsline_dev
DATABASE_URL_TEST=mysql+pymysql://statsline:statsline@localhost:3306/statsline_test
SECRET_KEY=cambiar-por-un-valor-largo-y-aleatorio
API_FOOTBALL_KEY=
SESION_HORAS=8
DEMO_CONTRASENA=
ENTORNO=desarrollo
```

## Primer arranque

```bash
docker compose up -d mysql
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m semillas.ligas
python -m semillas.usuario_demo
uvicorn app.main:app --reload            # http://localhost:8000/api/v1/salud y /docs

cd ../frontend
npm install
npm run dev                               # http://localhost:5173 (proxy /api → :8000)
```

## Cargar datos reales

```bash
cd backend
python -m app.sincronizacion.api_football              # 6 ligas, unos 300 pedidos
python -m app.sincronizacion.transfermarkt --archivo ~/Descargas/players.csv
```

## Tests

Ver `TESTING_STRATEGY.md`.

## Deploy (Railway)

Ver ADR-0006. Las variables de entorno se cargan en el servicio `web` y en el `cron`. El cron ejecuta `python -m app.sincronizacion.api_football` una vez por día.
