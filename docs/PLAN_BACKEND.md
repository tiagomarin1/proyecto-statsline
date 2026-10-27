# PLAN_BACKEND.md — División del backend entre Cilento y Marin

> Creado el 27/10/2026. Objetivo: llegar al Demo Day del 9/11 con el backend completo, sin que dos personas editen los mismos archivos al mismo tiempo.

## Criterio de división

Se divide **por módulo completo, de punta a punta**: router, servicio, repositorio y tests. Cada uno es dueño de sus archivos. Lo compartido se construye una sola vez y entre los dos, al principio. La asignación respeta los responsables que ya figuran en Trello.

| | Cilento | Marin |
|---|---|---|
| **Foco** | Usuario y búsqueda | Datos y jugador |
| **Features** | AUT-001, AUT-002, BUS-001, BUS-002, BUS-003, BUS-006, CMP-001, BUS-005 | DAT-001, DAT-002, BUS-004, JUG-001, SEG-001 |
| **Archivos propios** | `routers/auth.py`, `routers/ligas.py`, `routers/jugadores.py` (solo `GET /jugadores`), `routers/comparaciones.py`, `routers/perfil_busqueda.py`, `servicios/auth.py`, `servicios/busqueda.py`, `servicios/comparacion.py`, `seguridad/` | `sincronizacion/`, `integraciones/`, `servicios/metricas.py`, `servicios/presupuesto.py`, `servicios/ficha.py`, `servicios/coincidencia.py`, `routers/seguimiento.py`, el handler de `GET /jugadores/{id}` |

## Fase 0 — Juntos (27-28/10): INF-001

Se hace en pareja porque todo depende de esto:

- [ ] Estructura de carpetas de `ARQUITECTURA.md`, `pyproject.toml` y `docker-compose.yml` con MySQL de desarrollo y de test.
- [ ] **Una sola migración inicial con todo el modelo canónico.** Si cada uno crea migraciones en paralelo, se rompe la cadena de Alembic.
- [ ] Modelos ORM de todas las entidades.
- [ ] Semillas: las 6 ligas y el usuario demo.
- [ ] `tests/fabricas.py` con `crear_usuario`, `crear_liga`, `crear_jugador` y `crear_estadistica`.
- [ ] La dependencia `usuario_actual` (`seguridad/`), porque todos los endpoints 🔒 la usan.
- [ ] `GET /api/v1/salud`.
- [ ] Deploy inicial en Railway (servicio web + MySQL).

## Fases 1 a 4 — En paralelo

| Fechas | Cilento | Marin |
|---|---|---|
| 28-29/10 | **AUT-001** y **AUT-002**: registro, ingreso, salida y `/auth/yo` | **DAT-001**: sincronización con API-Football. Grabar los JSON reales de prueba en `tests/fixtures/api_football/`. **`servicios/metricas.py`** (RN-017 y RN-018) |
| 30/10-2/11 | **BUS-001**, **BUS-002** y **BUS-003**: consulta base de búsqueda y filtros de posición, edad, liga y métricas tácticas | **DAT-002**: importación de Transfermarkt y medición de la cobertura por liga. Si la cobertura del ascenso da mal, se avisa al PO ese mismo día |
| 2-3/11 | **BUS-006**: orden, paginado y sugerencia sin resultados (RN-016) | **BUS-004**: filtro de presupuesto, que se suma a la consulta de búsqueda |
| 3-5/11 | **CMP-001**: comparador | **JUG-001**: ficha con promedios de la posición y coincidencia con el perfil |
| 5-6/11 | **BUS-005**: perfil de búsqueda | **SEG-001**: lista de seguimiento |
| 6-8/11 | Juntos: integración con el front (Garrido), test E2E del recorrido de la demo, sincronización con datos reales en Railway y margen para imprevistos | (lo mismo) |

Las fechas siguen los vencimientos de Trello (AUT 6/11, CMP 5/11, JUG 4/11, BUS-003/004 3/11, BUS-001/002 2/11, DAT-001 29/10). AUT se adelanta porque todos los endpoints la necesitan.

## Puntos de contacto entre los dos

### 1. `servicios/metricas.py` — de Marin hacia Cilento

Es la función que devuelve la **estadística vigente de cada jugador** (RN-017), con las métricas derivadas ya calculadas (RN-018). La usan la búsqueda, la ficha y el comparador.

- Marin la entrega **primero** (28-29/10), con una firma acordada en la fase 0.
- Mientras tanto, Cilento testea con datos creados con `tests/fabricas.py`, no con datos sincronizados.

### 2. Filtro de presupuesto en la búsqueda — de Cilento hacia Marin

- Cilento arma `servicios/busqueda.py` para que **cada filtro sea una función aparte** que recibe y devuelve la consulta (`filtrar_por_posicion`, `filtrar_por_liga`, `filtrar_por_edad`, `filtrar_por_metricas`).
- Marin escribe `filtrar_por_presupuesto` y el conteo de `excluidos_sin_valor` en `servicios/presupuesto.py`. En `busqueda.py` solo se agrega **una línea** para engancharlo.

### 3. `GET /jugadores/{id}`

El router `jugadores.py` es de Cilento, pero el handler de la ficha y su servicio (`ficha.py`, `coincidencia.py`) son de Marin. Se acuerda en la fase 0 quién crea el archivo; el otro solo agrega su función.

## Reglas para no pisarse

- **Ramas:** una por feature (`feature/<ID>-descripcion`), PRs chicos hacia `main`.
- **Revisión cruzada obligatoria:** cada uno revisa los PRs del otro. Lo pide la Definition of Done (`ENGINEERING_STANDARDS.md` §12) y además sirve para que los dos conozcan todo el código.
- **Archivos compartidos:**
  - **Modelos y migraciones:** se tocan solo con aviso previo y de a uno. Antes de crear una migración, hay que traer `main` actualizado.
  - **`main.py`:** cada uno agrega solo la línea de su router.
  - **`tests/fabricas.py`:** se pueden sumar funciones, pero no cambiar las firmas existentes sin acordarlo.
- **El contrato de la API ya está definido** (`CONTRATO_DE_API.md`). Si alguno necesita cambiarlo, lo actualiza en el documento y avisa al otro y a Garrido **antes** de cambiar el código.
- **El frontend no espera al backend:** Garrido trabaja contra el contrato con datos de prueba.

## Seguimiento

- Al terminar cada feature: se actualiza su estado en `CATALOGO_DE_FEATURES.md`, se agrega una línea en `CHANGELOG.md` y se mueve la tarjeta en Trello.
- Si una fase se atrasa más de un día, se avisa en el grupo y se reordena. El margen está en la fase del 6 al 8/11.
