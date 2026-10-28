# CHANGELOG.md

Se agrega una línea cada vez que una feature pasa a `hecho`, en el mismo commit.

## 2026-10-28
- Decisión: la base pasa de MySQL 8 a PostgreSQL 16 (ADR-0010, que reemplaza el motor de ADR-0002). En producción, Aiven for PostgreSQL. La migración `0001` se regeneró para PostgreSQL antes de aplicarse en una base compartida.

## 2026-10-27
- Decisión: el deploy pasa de Railway a Render + Aiven + GitHub Actions, todo gratis (ADR-0009 aceptada, ADR-0006 reemplazada).
- Cambio de nombre del producto: ScoutIAndo pasa a llamarse StatsLine. El repo `tiagomarin1/proyecto-statsline` es un monorepo (`/backend`, `/frontend`, `/docs`).
- Documentación inicial del repo: visión, glosario, modelo canónico, arquitectura, ADR 0001-0008, reglas RN-001 a RN-026, catálogo, specs del MVP v1, contrato de API e integraciones.
- Decisiones: alcance de datos = API-Football; valor de mercado de transfermarkt-datasets en EUR; Score fuera del v1; 4 posiciones; filtros tácticos pases, duelos, recuperaciones y minutos; registro con los campos del prototipo; deploy en Railway.
