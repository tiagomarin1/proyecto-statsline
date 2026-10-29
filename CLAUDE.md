# CLAUDE.md — StatsLine (Equipo 04, UADE)

Leé este archivo antes de cada tarea. Es el acuerdo de trabajo con la IA (el `AI_WORKING_AGREEMENT.md` del manual).

## Qué es el proyecto (en 5 líneas)

- StatsLine (antes ScoutIAndo) es una plataforma web para clubes de fútbol chicos y medianos de Argentina.
- Sirve para buscar candidatos con filtros tácticos y de presupuesto, compararlos (2 o 3) y ver la ficha de cada uno.
- Los datos de rendimiento salen de **API-Football**. El valor de mercado sale del dataset público **transfermarkt-datasets**, en EUR.
- Stack: **FastAPI + PostgreSQL + React (Vite)** (ADR-0010).
- Hitos: **Demo Day el 9/11/2026** y **MVP v2 el 16/11/2026**.

Para el contexto completo, leé `docs/VISION.md` y `docs/contexto/INVESTIGACION.md`.

## Orden de lectura antes de implementar una feature

1. `docs/GLOSARIO.md`: términos canónicos. El código usa exactamente esos nombres.
2. `docs/CATALOGO_DE_FEATURES.md`: ubicá la feature, su ID y su estado.
3. `docs/specs/<modulo>/<ID>.md`: la spec de la feature.
4. `docs/MODELO_CANONICO_DE_DATOS.md`: las entidades que toca.
5. `docs/REGLAS_DE_NEGOCIO.md`: las reglas RN-XXX que referencia la spec.
6. `docs/ENGINEERING_STANDARDS.md`: cómo se escribe el código.
7. `docs/TESTING_STRATEGY.md`: qué tests son obligatorios.

Recién después de esto se escribe el primer test (rojo), después el código (verde) y al final se refactoriza.

## Reglas de trabajo

- **No se escribe código sin spec.** Si la spec no cumple `docs/DEFINITION_OF_READY.md`, lo primero es decir qué falta, no completarlo por tu cuenta.
- **Nunca inventes una regla de negocio.** Si falta una, proponela en `REGLAS_DE_NEGOCIO.md` con un ejemplo numérico, marcala como `(propuesta)` y pedí validación.
- **Alcance de datos = API-Football.** No agregues métricas que la API no trae. La única excepción documentada es el valor de mercado de Transfermarkt (ADR-0004).
- **Datos faltantes:** se muestra "Dato no disponible" y nunca un 0. Ver RN-008.
- **Todo en español:** código, tablas, columnas, funciones, variables, endpoints, tests y commits. Quedan en inglés solo las palabras reservadas y los nombres de librerías o frameworks (por ejemplo `router`, `session`, `useState`). No mezcles: es `jugador`, no `player` ni `candidate`.
- **Tests:** nunca le pegues a API-Football real en tests unitarios o de integración. Se usan los fixtures de `backend/tests/fixtures/`.
- **No se cambia sin aprobación explícita:**
  - el modelo canónico de datos;
  - `ENGINEERING_STANDARDS.md`;
  - las migraciones ya aplicadas (no se borran ni se editan);
  - las ADR aceptadas.
- **Al terminar una feature:**
  - actualizá su estado en `CATALOGO_DE_FEATURES.md`;
  - sumá una línea en `docs/CHANGELOG.md`;
  - si agregaste un término, sumalo a `GLOSARIO.md` en el mismo commit.
- **Commits:** `<ID>: <qué hace>`, en español. Ejemplo: `BUS-002: filtra candidatos por presupuesto`.
- **Supuestos:** lo marcado como **(supuesto)** en las docs todavía no lo confirmó el equipo. Implementalo como está, pero no lo extiendas.

## Estructura del repo

```
/CLAUDE.md              este archivo
/README.md              presentación del repo
/docs                   toda la documentación (SDD)
  /specs                una spec por feature
  /adr                  decisiones de arquitectura
  /contexto             investigación, personas y alcance
/prototipo              prototipo navegable v1 (HTML/JS estático, datos ficticios); referencia visual, no es código de producción
/backend                FastAPI (se crea en INF-001)
/frontend               React + Vite (se crea en INF-001)
```

## Pendientes que afectan el desarrollo

Ver la sección "Pendientes" de `docs/REGLAS_DE_NEGOCIO.md`. Los más importantes:

- RN-028 **(propuesta)**: cómo se muestran Primera C y Primera D, que no tienen datos en ninguna temporada.
- RN-002, paso 2b **(propuesta)**: el cruce por palabras con Transfermarkt.
- El valor de mercado casi no cubre el ascenso (el dataset solo tiene la Liga Profesional). Ver RN-002.
