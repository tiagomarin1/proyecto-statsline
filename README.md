# StatsLine

Plataforma para que clubes de fútbol chicos y medianos comparen jugadores por rendimiento y presupuesto, sin necesidad de un analista de datos.

**Equipo 04 · UADE · 2026** · Backlog en Trello: https://trello.com/b/r9whF8Jq

> Antes se llamaba ScoutIAndo. El prototipo v1 y el tablero de Trello todavía usan ese nombre.

## Qué hay en este repo

| Carpeta | Qué contiene |
|---|---|
| `CLAUDE.md` | Acuerdo de trabajo con la IA y orden de lectura. **Empezá por acá.** |
| `docs/` | Documentación del proyecto: visión, glosario, modelo de datos, reglas de negocio, catálogo de features y specs |
| `prototipo/` | Prototipo navegable v1. Abrí `prototipo/index.html` en el navegador (usuario `javier@deportivonorte.com`, contraseña `scoutiando`) |
| `backend/` | API en FastAPI + MySQL (se crea con INF-001) |
| `frontend/` | App en React + Vite (se crea con INF-001) |

## Cómo se trabaja

Usamos **Spec-Driven Development + TDD asistido por IA**: ninguna feature se implementa sin una spec con criterios de aceptación, y ninguna está terminada sin tests en verde. La metodología completa está en el `MANUAL_DE_DESARROLLO.md` del Project de Claude. Este repo ya tiene todos los documentos que ese manual pide, y `CLAUDE.md` resume cómo usarlos.

Cómo levantar el proyecto: `docs/SETUP.md`.

### Ciclo de cada feature

1. **Leer antes de escribir código**, en el orden de `CLAUDE.md`: glosario, catálogo, spec (`docs/specs/<modulo>/<ID>.md`), modelo de datos, reglas de negocio, estándares y estrategia de testing. Si la spec no cumple `docs/DEFINITION_OF_READY.md`, se avisa qué falta antes de arrancar.
2. **Crear la rama** desde `main` actualizado: `feature/<ID>-descripcion-corta` (por ejemplo `feature/AUT-001-registro`).
3. **Tests en rojo:** un test por escenario Given/When/Then de la spec, con el nombre `test_<id>_<escenario>`. Commit: `<ID>: tests en rojo`.
4. **Implementar** lo mínimo para ponerlos en verde. Commit: `<ID>: <qué hace>`.
5. **Refactorizar** con los tests en verde. Antes del PR tienen que pasar `ruff check` y `pytest`.
6. **Abrir un PR chico a `main`.** Tiene que enlazar la spec y listar los escenarios cubiertos.
7. **Revisión cruzada:** el PR lo aprueba el otro integrante del backend. Nadie mergea su propio PR sin revisión.
8. **Al mergear:**
   - se pasa la feature a `hecho` en `docs/CATALOGO_DE_FEATURES.md`;
   - se suma una línea en `docs/CHANGELOG.md`;
   - se mueve la tarjeta en Trello.

### Reglas que no se negocian

- **Todo en español:** código, tablas, endpoints, tests y commits, con los nombres de `docs/GLOSARIO.md`.
- **Dato faltante:** se devuelve `null`, nunca `0` (RN-008).
- **Tests:** ni los unitarios ni los de integración le pegan a API-Football real. Se usan los fixtures de `backend/tests/fixtures/`.
- **Secretos:** van solo en `.env`, que no se sube. En el repo está `.env.example`.
- **Reglas de negocio:** no se inventan. Si falta una, se propone en `docs/REGLAS_DE_NEGOCIO.md` como `(propuesta)` y se valida con el PO.

## División del backend

> Fuente de verdad: [`docs/PLAN_BACKEND.md`](docs/PLAN_BACKEND.md). Si cambia algo, se actualiza primero ese archivo y después este resumen.

El trabajo se divide **por módulo completo, de punta a punta**: router, servicio, repositorio y tests. Cada uno es dueño de sus archivos. Lo compartido se construye una sola vez y entre los dos, al principio.

| | Cilento ([@Santicilento](https://github.com/Santicilento)) | Marin ([@tiagomarin1](https://github.com/tiagomarin1)) |
|---|---|---|
| **Foco** | Usuario y búsqueda | Datos y jugador |
| **Features** | AUT-001, AUT-002, BUS-001, BUS-002, BUS-003, BUS-006, CMP-001, BUS-005 | DAT-001, DAT-002, BUS-004, JUG-001, SEG-001 |
| **Archivos propios** | `routers/auth.py`, `routers/ligas.py`, `routers/jugadores.py` (`GET /jugadores`), `routers/comparaciones.py`, `routers/perfil_busqueda.py`, `servicios/auth.py`, `servicios/busqueda.py`, `servicios/comparacion.py`, `seguridad/` | `sincronizacion/`, `integraciones/`, `servicios/metricas.py`, `servicios/presupuesto.py`, `servicios/ficha.py`, `servicios/coincidencia.py`, `routers/seguimiento.py`, el handler de `GET /jugadores/{id}` |

### Fase 0, juntos (27 y 28/10): INF-001

Se hace en pareja porque todo lo demás depende de esto:

- la estructura de carpetas de `docs/ARQUITECTURA.md`, `pyproject.toml` y `docker-compose.yml` con MySQL de desarrollo y de test;
- **una sola migración inicial** con todo el modelo canónico, para no romper la cadena de Alembic;
- los modelos ORM de todas las entidades;
- las semillas de las 6 ligas y del usuario demo;
- `tests/fabricas.py`;
- la dependencia `usuario_actual`;
- `GET /api/v1/salud`;
- el primer deploy en Railway.

En esta fase también se acuerdan la firma de `servicios/metricas.py` y quién crea `routers/jugadores.py`.

### Fases 1 a 4, en paralelo

| Fechas | Cilento | Marin |
|---|---|---|
| 28-29/10 | AUT-001 y AUT-002: registro, ingreso, salida y `/auth/yo` | DAT-001: sincronización con API-Football y fixtures reales. `servicios/metricas.py` (RN-017 y RN-018) |
| 30/10-2/11 | BUS-001, BUS-002 y BUS-003: consulta base y filtros de posición, edad, liga y métricas tácticas | DAT-002: importación de Transfermarkt y medición de la cobertura por liga |
| 2-3/11 | BUS-006: orden, paginado y sugerencia sin resultados | BUS-004: filtro de presupuesto |
| 3-5/11 | CMP-001: comparador | JUG-001: ficha, promedios de la posición y coincidencia con el perfil |
| 5-6/11 | BUS-005: perfil de búsqueda | SEG-001: lista de seguimiento |
| 6-8/11 | Juntos: integración con el front (Garrido), E2E del recorrido de la demo, sincronización con datos reales en Railway y margen para imprevistos | (lo mismo) |

### Puntos de contacto

1. **`servicios/metricas.py`, de Marin a Cilento.** Devuelve la estadística vigente de cada jugador (RN-017) con las métricas derivadas ya calculadas (RN-018). La usan la búsqueda, la ficha y el comparador. Marin la entrega primero (28-29/10). Mientras tanto, Cilento testea con datos de `tests/fabricas.py`.
2. **Filtro de presupuesto, de Cilento a Marin.** En `servicios/busqueda.py` cada filtro es una función aparte que recibe y devuelve la consulta. Marin escribe `filtrar_por_presupuesto` y el conteo de `excluidos_sin_valor` en `servicios/presupuesto.py`, y en `busqueda.py` se agrega una sola línea para engancharlo.
3. **`GET /jugadores/{id}`.** El router `jugadores.py` es de Cilento, pero el handler de la ficha y sus servicios (`ficha.py`, `coincidencia.py`) son de Marin.

### Para no pisarnos

- **Modelos y migraciones:** se tocan solo con aviso previo y de a uno. Antes de crear una migración, hay que traer `main` actualizado.
- **`main.py`:** cada uno agrega solo la línea de su router.
- **`tests/fabricas.py`:** se pueden sumar funciones, pero las firmas existentes no se cambian sin acordarlo.
- **El contrato de la API ya está definido** en `docs/CONTRATO_DE_API.md`. Si hay que cambiarlo, primero se actualiza el documento y se avisa al otro y a Garrido.
- **El frontend no espera al backend:** Garrido trabaja contra el contrato con datos de prueba.
- **Atrasos:** si una fase se atrasa más de un día, se avisa en el grupo y se reordena. El margen está en la fase del 6 al 8/11.

## Fechas

| Hito | Fecha |
|---|---|
| Demo Day (MVP v1) | 9/11/2026 |
| MVP v2 | 16/11/2026 |
| Testeo con club piloto | noviembre 2026 |
| Evaluación de resultados | primeras dos semanas de diciembre 2026 |
