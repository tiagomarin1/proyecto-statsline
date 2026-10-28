# SETUP.md

Cómo levantar StatsLine desde un clon limpio. Se escribió al cerrar INF-001.

## Requisitos

- **Python 3.12.** Si tu Python es otro, `uv` instala el 3.12 sin tocar el del sistema.
- **Node 22 LTS.** También anda con Node 20 o más nuevo.
- **Docker y Docker Compose**, para PostgreSQL 16. Sin Docker, mirá "PostgreSQL sin Docker" más abajo.
- **Una clave de API-Football (plan Pro)** para sincronizar. Para los tests no hace falta.

## Variables de entorno

Van en `backend/.env`, que se crea a partir de `backend/.env.example`. El `.env` no se sube al repo.

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Base de desarrollo (`postgresql+psycopg://...`). También acepta la URL de Aiven tal cual (`postgres://...?sslmode=require`) |
| `DATABASE_SSL_CA` | Solo en producción. Contenido del CA de Aiven (PEM). Con esto la conexión usa TLS y verifica el servidor |
| `DATABASE_URL_TEST` | Base de test. **pytest la borra y la recrea** en cada corrida, así que su nombre tiene que terminar en `_test` (si no, los tests frenan antes de borrar nada) |
| `SECRET_KEY` | Firma de la cookie de sesión. Tiene que ser larga y aleatoria: con `ENTORNO=produccion`, la app no arranca si tiene menos de 32 caracteres |
| `API_FOOTBALL_KEY` | Solo para la sincronización (DAT-001) |
| `SESION_HORAS` | Duración de la sesión. Por defecto es 8 (ADR-0005) |
| `DEMO_CONTRASENA` | Contraseña del usuario demo |
| `ENTORNO` | `desarrollo`, `test` o `produccion` |
| `DIRECTORIO_FRONTEND` | Opcional. Carpeta del build de React que sirve FastAPI. Por defecto es `frontend/dist` |

## Primer arranque

```bash
docker compose up -d postgres             # PostgreSQL 16 con statsline_dev y statsline_test

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

### PostgreSQL sin Docker

Sirve cualquier PostgreSQL 16 o más nuevo, por ejemplo el de Homebrew (`brew install postgresql@16`). Con un usuario administrador, se crea el usuario `statsline` y las dos bases:

```bash
psql -d postgres -c "CREATE ROLE statsline LOGIN PASSWORD 'statsline' CREATEDB"
psql -d postgres -c "CREATE DATABASE statsline_dev OWNER statsline"
psql -d postgres -c "CREATE DATABASE statsline_test OWNER statsline"
```

El usuario necesita `CREATEDB` porque pytest borra y recrea `statsline_test`. Si tu servidor no usa el puerto 5432, ajustá el host y el puerto en `DATABASE_URL` y `DATABASE_URL_TEST`. La app fija `timezone=UTC` en cada conexión, así que no hace falta configurar la zona del servidor.

## Tests y lint

```bash
cd backend
pytest                                    # todo: unitarios + integración contra statsline_test
pytest tests/unitarios                    # rápido, sin base
pytest -m integracion                     # solo los que usan PostgreSQL
pytest --cov=app --cov=semillas           # con cobertura
ruff format . && ruff check .

cd frontend
npm test                                  # Vitest
npm run lint                              # ESLint
npm run build                             # chequeo de tipos + build
```

Más detalle en `TESTING_STRATEGY.md`.

## Cargar datos reales

```bash
cd backend
python -m app.sincronizacion.api_football                  # 6 ligas, unos 300 pedidos (DAT-001)
python -m app.sincronizacion.api_football --liga 2 --temporada 2025   # una liga (id interno) y una temporada
python -m app.sincronizacion.transfermarkt --archivo ~/Descargas/players.csv   # cuando exista DAT-002
```

La sincronización necesita `API_FOOTBALL_KEY`. Si tu red no llega a `api-sports.io`, corréla desde GitHub: *Actions → Sincronización diaria → Run workflow*, donde se pueden completar la liga y la temporada. Sale con código 1 si alguna liga falló; el detalle queda en la tabla `sincronizacion`.

## Deploy (Render + Aiven + GitHub Actions)

ADR-0009 (que reemplaza a ADR-0006) y ADR-0010 (PostgreSQL). Las tres piezas son gratis y ninguna pide tarjeta.

| Pieza | Dónde | Qué hace |
|---|---|---|
| App | Render, servicio `statsline` (`render.yaml`) | Construye el `Dockerfile` de la raíz. Al arrancar corre `python -m app.preparar_base` (migraciones y semillas, con un bloqueo de PostgreSQL) y después `uvicorn`. El healthcheck es `/api/v1/salud` |
| PostgreSQL | Aiven, plan gratis | PostgreSQL con TLS obligatorio (ADR-0010) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) | Tests de backend y frontend, más el build y el arranque de la imagen. Si pasa en `main`, el job `desplegar` llama al deploy hook de Render |
| Sincronización | GitHub Actions (`.github/workflows/sincronizacion.yml`) | Todos los días a las 03:00 de Argentina. Hasta que exista DAT-001, no hace nada |

### 1. Base en Aiven

1. Crear la cuenta en https://aiven.io con el plan gratis.
2. Crear un servicio **PostgreSQL** con el plan **Free**, en una región del este de EE. UU. si está disponible.
3. En la pestaña *Overview* del servicio, copiar dos cosas:
   - la **Service URI**, con la forma `postgres://avnadmin:...@...aivencloud.com:PUERTO/defaultdb?sslmode=require`. Va tal cual como `DATABASE_URL`;
   - el **CA certificate** (descargar `ca.pem`). Su contenido va como `DATABASE_SSL_CA`.

### 2. App en Render

1. Crear la cuenta en https://render.com, entrando con GitHub.
2. Ir a *New → Blueprint* y elegir el repo `tiagomarin1/proyecto-statsline`. Render lee `render.yaml` y crea el servicio `statsline`. El repo es de Marin, así que la app de Render en GitHub tiene que tener acceso a ese repo, y puede que lo tenga que autorizar él.
3. Completar las variables que el Blueprint deja vacías:
   - `DATABASE_URL`: la Service URI de Aiven;
   - `DATABASE_SSL_CA`: el contenido de `ca.pem`, pegado entero, con las líneas `BEGIN` y `END`;
   - `DEMO_CONTRASENA`: la contraseña del usuario demo.

   `SECRET_KEY` la genera Render.
4. El primer deploy crea las tablas y carga las ligas y el usuario demo. Para verificar, abrir `https://<servicio>.onrender.com/api/v1/salud`.

Render despliega solo `main` y solo con el CI en verde: el auto-deploy de Render está apagado (`autoDeployTrigger: off`) porque Render no recibe los push del repo, y el deploy lo pide el job `desplegar` del CI con el deploy hook (paso 3). Para desplegar a mano: *Manual Deploy → Deploy latest commit* en el panel del servicio. Si el servicio pasa 15 minutos sin tráfico, se apaga, y la primera visita tarda alrededor de un minuto. Antes de una demo, abrí la página unos minutos antes.

### 3. Secrets del cron en GitHub

En el repo: *Settings → Secrets and variables → Actions*. Los carga el dueño del repo (Marin).

| Secret | Valor |
|---|---|
| `DATABASE_URL` | La misma Service URI de Aiven |
| `DATABASE_SSL_CA` | El mismo contenido de `ca.pem` |
| `API_FOOTBALL_KEY` | La clave de API-Football |
| `RENDER_DEPLOY_HOOK` | El deploy hook del servicio: en Render, *Settings → Deploy Hook*. Es secreto: con esa URL cualquiera puede desplegar. Si falta, el CI no despliega y deja un aviso |

Para correrla a mano: pestaña *Actions → Sincronización diaria → Run workflow*. GitHub desactiva los workflows programados si el repo pasa 60 días sin actividad.

### Conectarse a la base de producción desde la máquina

Por ejemplo, para la importación de Transfermarkt (DAT-002): poné en `backend/.env` la `DATABASE_URL` y el `DATABASE_SSL_CA` de Aiven y corré el comando de siempre. Los tests no usan esas variables: usan `DATABASE_URL_TEST`.
