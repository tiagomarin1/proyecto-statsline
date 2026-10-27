# ARQUITECTURA.md

## Vista general

```
Navegador (React SPA)
   │  HTTPS, cookie de sesión httpOnly
   ▼
FastAPI  ── sirve /api/v1/* y además el build estático de React (ADR-0003)
   │
   ├─ routers/       HTTP: validación de entrada/salida, sin lógica de negocio
   ├─ servicios/     lógica de negocio pura (reglas RN-XXX), testeable sin DB
   ├─ repositorios/  acceso a MySQL con SQLAlchemy 2
   └─ integraciones/ clientes de API-Football y lector del CSV de Transfermarkt
                         │
MySQL 8 ◄──── sincronizacion/ (CLI batch, NO corre en cada pedido del usuario, ADR-0008)
                         │
              API-Football v3   +   transfermarkt-datasets (CSV)
```

**Regla clave:** las pantallas **nunca** llaman a API-Football en vivo. Todo sale de MySQL, que se llena con la sincronización batch. Así se respeta el cupo de 7.500 pedidos por día y la demo no depende de que la API externa responda.

## Stack

| Capa | Tecnología | ADR |
|---|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2 | ADR-0001 |
| Datos | MySQL 8, SQLAlchemy 2 (sync), Alembic, PyMySQL | ADR-0002 |
| Frontend | React 18, Vite, TypeScript, React Router | ADR-0003 |
| Autenticación | JWT en cookie httpOnly, hash Argon2 (`pwdlib`) | ADR-0005 |
| Deploy | Railway: servicio web, MySQL y cron de sincronización | ADR-0006 |
| Idioma del código | Español | ADR-0007 |
| Datos externos | Sincronización batch a MySQL | ADR-0008 |
| Valor de mercado | transfermarkt-datasets (CSV, CC0) | ADR-0004 |
| Tests | pytest, httpx (TestClient), Vitest, Testing Library, Playwright para el recorrido de la demo | `TESTING_STRATEGY.md` |

## Estructura de carpetas

```
/backend
  /app
    main.py               crea la app, monta los routers y sirve el build de React
    config.py             variables de entorno (pydantic-settings)
    db.py                 engine y sesión de SQLAlchemy
    /modelos              modelos ORM, un archivo por entidad (jugador.py, liga.py…)
    /esquemas             esquemas Pydantic de request y response
    /routers              auth.py, ligas.py, jugadores.py, comparaciones.py,
                          perfil_busqueda.py, seguimiento.py
    /servicios            busqueda.py, comparacion.py, ficha.py, metricas.py,
                          presupuesto.py, coincidencia.py, auth.py
    /repositorios         un archivo por entidad
    /integraciones        cliente_api_football.py, lector_transfermarkt.py
    /sincronizacion       api_football.py, transfermarkt.py (se corren con python -m)
    /seguridad            hash de contraseñas, JWT, dependencia usuario_actual
  /migraciones            Alembic
  /semillas               ligas.py, usuario_demo.py
  /tests
    /unitarios            servicios y reglas, sin DB
    /integracion          routers y repositorios contra MySQL de test
    /fixtures/api_football  respuestas JSON reales grabadas
    /fixtures/transfermarkt players_muestra.csv
  pyproject.toml
/frontend
  /src
    /paginas              Inicio, Ingreso, Registro, Buscar, Comparar, Ficha, Seguimiento
    /componentes          PanelFiltros, TablaCandidatos, TarjetaCandidato, BarraSeleccion,
                          FilaComparacion, DatoNoDisponible, ChipCobertura…
    /servicios            api.ts (fetch con credentials: 'include')
    /tipos                tipos TS que reflejan los esquemas del backend
    /estilos              tokens y estilos portados del prototipo (styles.css)
  vite.config.ts          proxy de /api hacia localhost:8000 en desarrollo
/prototipo                referencia visual v1, no se modifica
/docs
```

## Convenciones

- **Un endpoint = una función de router** que llama a un servicio. El router no hace consultas ni cálculos.
- **Los servicios reciben y devuelven tipos simples** (dataclasses o esquemas). Las reglas RN-XXX viven en `servicios/` y cada función documenta qué RN implementa.
- **Los nombres de archivo** van en `snake_case` (Python) o `PascalCase.tsx` (componentes).
- **API:** el prefijo es `/api/v1`, los recursos van en plural y en español (`/jugadores`, `/comparaciones`) y el JSON va en `snake_case`.
- **Errores:** `{"detalle": "<mensaje para el usuario>", "codigo": "<codigo_maquina>"}`.
- **Estilos:** se portan los tokens y breakpoints del prototipo (1024px y 768px). La UI respeta los estados del prototipo: "Dato no disponible", "Datos básicos", liga sin datos, sin resultados y error genérico de login.

## Integraciones externas

```
sincronizacion/api_football.py ──GET /leagues, /players?league&season&page──► API-Football v3
        │                                         (x-apisports-key en el header)
        └──► MySQL: liga, equipo, jugador, estadistica_temporada, sincronizacion

sincronizacion/transfermarkt.py ──lee players.csv──► transfermarkt-datasets
        └──► MySQL: jugador.valor_mercado_eur, id_transfermarkt (cruce RN-002)
```

El detalle está en `INTEGRACIONES_EXTERNAS.md`.
