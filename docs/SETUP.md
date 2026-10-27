# SETUP.md

Cómo levantar StatsLine desde un clon limpio. Se escribió al cerrar INF-001.

## Requisitos

- **Python 3.12.** Si tu Python es otro, `uv` instala el 3.12 sin tocar el del sistema.
- **Node 22 LTS.** También anda con Node 20 o más nuevo.
- **Docker y Docker Compose**, para MySQL 8. Sin Docker, mirá "MySQL sin Docker" más abajo.
- **Una clave de API-Football (plan Pro)** para sincronizar. Para los tests no hace falta.

## Variables de entorno

Van en `backend/.env`, que se crea a partir de `backend/.env.example`. El `.env` no se sube al repo.

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Base de desarrollo. También acepta `mysql://...`, como la entrega Railway |
| `DATABASE_URL_TEST` | Base de test. **pytest la borra y la recrea** en cada corrida |
| `SECRET_KEY` | Firma de la cookie de sesión. Tiene que ser larga y aleatoria |
| `API_FOOTBALL_KEY` | Solo para la sincronización (DAT-001) |
| `SESION_HORAS` | Duración de la sesión. Por defecto es 8 (ADR-0005) |
| `DEMO_CONTRASENA` | Contraseña del usuario demo |
| `ENTORNO` | `desarrollo`, `test` o `produccion` |
| `DIRECTORIO_FRONTEND` | Opcional. Carpeta del build de React que sirve FastAPI. Por defecto es `frontend/dist` |

## Primer arranque

```bash
docker compose up -d mysql                # MySQL 8 con statsline_dev y statsline_test

cd backend
cp .env.example .env                      # completá SECRET_KEY y DEMO_CONTRASENA
uv venv --python 3.12 .venv               # o: python3.12 -m venv .venv
source .venv/bin/activate
uv pip install -e ".[dev]"                # o: pip install -e ".[dev]"
alembic upgrade head                      # crea todas las tablas del modelo canónico
python -m semillas.ligas                  # las 6 ligas del MVP
python -m semillas.usuario_demo           # javier@deportivonorte.com con DEMO_CONTRASENA
uvicorn app.main:app --reload             # http://localhost:8000/api/v1/salud y /docs

cd ../frontend
npm install
npm run dev                               # http://localhost:5173 (proxy de /api a :8000)
```

Las dos semillas se pueden correr las veces que haga falta: no duplican nada.

**Para ver el build de producción en local:** corré `npm run build` en `frontend/` y abrí `http://localhost:8000`. FastAPI sirve `frontend/dist` y devuelve `index.html` en cualquier ruta que no sea `/api`, `/docs` u `/openapi.json`.

### MySQL sin Docker

Sirve cualquier MySQL 8 o más nuevo, por ejemplo el de Homebrew. Con un usuario administrador, se crean el usuario y las dos bases:

```bash
mysql -uroot -e "CREATE USER 'statsline'@'%' IDENTIFIED BY 'statsline'; CREATE DATABASE statsline_dev CHARACTER SET utf8mb4; GRANT ALL PRIVILEGES ON statsline_dev.* TO 'statsline'@'%';"
mysql -uroot < docker/mysql/01-bases.sql
```

Después se ajusta el host y el puerto en `DATABASE_URL` y `DATABASE_URL_TEST`. Conviene arrancar el servidor con `--default-time-zone=+00:00`, aunque la app igual fija la zona en UTC en cada conexión.

## Tests y lint

```bash
cd backend
pytest                                    # todo: unitarios + integración contra statsline_test
pytest tests/unitarios                    # rápido, sin base
pytest -m integracion                     # solo los que usan MySQL
pytest --cov=app --cov=semillas           # con cobertura
ruff format . && ruff check .

cd frontend
npm test                                  # Vitest
npm run lint                              # ESLint
npm run build                             # chequeo de tipos + build
```

Más detalle en `TESTING_STRATEGY.md`.

## Cargar datos reales

Estos comandos existen recién cuando se cierran DAT-001 y DAT-002:

```bash
cd backend
python -m app.sincronizacion.api_football                  # 6 ligas, unos 300 pedidos
python -m app.sincronizacion.transfermarkt --archivo ~/Descargas/players.csv
```

## Deploy (Railway)

ADR-0006. Todo sale del mismo repo:

| Servicio | Cómo se configura |
|---|---|
| `web` | Usa el `Dockerfile` de la raíz y `railway.toml`. Antes de cada deploy corre `alembic upgrade head`. El healthcheck es `/api/v1/salud` |
| `MySQL` | Plugin de MySQL de Railway. Su `MYSQL_URL` va como `DATABASE_URL` del servicio `web` |
| `cron` | **Se crea con DAT-001.** Usa la misma imagen, con el comando `python -m app.sincronizacion.api_football` y la programación `0 6 * * *` (una vez por día, a las 3 de la mañana en Argentina) |

Variables del servicio `web`:

- `DATABASE_URL`, como referencia a `${{MySQL.MYSQL_URL}}`;
- `SECRET_KEY`;
- `SESION_HORAS`;
- `DEMO_CONTRASENA`;
- `ENTORNO=produccion`.

El servicio `cron` usa las mismas, más `API_FOOTBALL_KEY`.

Las semillas se corren una vez, desde el panel de Railway o con `railway run`:

```bash
railway run --service web python -m semillas.ligas
railway run --service web python -m semillas.usuario_demo
```
