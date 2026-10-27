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

## Fechas

| Hito | Fecha |
|---|---|
| Demo Day (MVP v1) | 9/11/2026 |
| MVP v2 | 16/11/2026 |
| Testeo con club piloto | noviembre 2026 |
| Evaluación de resultados | primeras dos semanas de diciembre 2026 |
