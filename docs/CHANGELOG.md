# CHANGELOG.md

Se agrega una línea cada vez que una feature pasa a `hecho`, en el mismo commit.

## 2026-11-14
- UI-003: hero nuevo en la home. Una pelota real rueda de izquierda a derecha por la línea de una cancha mientras se hace scroll, con el hero fijado entre 220 % y 300 % del alto, y a su paso aparecen puntos y tarjetas de datos. Se hace con `gsap` y `@gsap/react`, mueve solo `transform` y `opacity`, y con movimiento reducido (`prefers-reduced-motion`) queda estático y completo. Los chips de ligas pasan a ser informativos (antes cambiaban la maqueta, que se eliminó). Las cifras de las tarjetas son ilustrativas. **Pendiente:** confirmar la licencia y el autor de las dos fotos antes de publicar. Los prototipos de referencia están en `prototipos-landing/`.
- UI-002: Buscar con filtros en vivo (sin botón "Aplicar filtros"), chips de filtros aplicados, tabla ordenable por columna y panel de detalle del jugador sin salir de la lista. En pantallas de menos de 768 px se mantienen las tarjetas. Solo frontend: el contrato de API no cambia. La búsqueda por nombre queda pendiente: necesita spec y cambio de backend.
- UI-001: rebranding aplicado al frontend según la hoja de marca del 29/10/2026. Paleta grafito, papel y oro (los neutros se derivaron de esos tres y los estados de éxito, alerta y error se mantienen, **(supuesto)** pendiente de validar con quien diseñó la marca), logotipo `statsline` con bastas dibujadas, tipografía Archivo y favicon. La mascota queda fuera: todavía no tiene nombre ni set de poses.

## 2026-11-01
- Arreglos en Buscar. BUS-002: la liga que llega por la URL o con "Volver a resultados" se muestra elegida y no se pierde al aplicar otro filtro. BUS-004: el presupuesto se limita al rango de RN-003 (EUR 20.000 a 400.000, de a 5.000) y lo indica; un 422 muestra el mensaje de cada campo en lugar del genérico, sin dejar los resultados viejos a la vista.
- Frontend del MVP implementado: pantallas Inicio, Ingreso, Registro, Buscar, Ficha, Comparación (CMP-001) y Seguimiento, construidas contra `CONTRATO_DE_API.md`. Entregado como PR del frontend a `main` (rama `feature/frontend-mvp`), pendiente de revisión y merge.

## 2026-10-29
- Decisión con el PO: RN-027 aprobada. Cada liga usa la temporada más reciente con al menos 100 jugadores con minutos; el ascenso queda en 2025 hasta que 2026 tenga el plantel cargado, y se pueden mezclar temporadas mostrando la de cada jugador. Implementada en la sincronización (DAT-001).

## 2026-10-28
- INF-001 hecho: monorepo con FastAPI, React y PostgreSQL, CI en GitHub Actions y deploy en Render + Aiven. App publicada en https://statsline-4dyy.onrender.com (`/api/v1/salud` responde ok con la base de Aiven).
- Decisión: la base pasa de MySQL 8 a PostgreSQL 16 (ADR-0010, que reemplaza el motor de ADR-0002). En producción, Aiven for PostgreSQL. La migración `0001` se regeneró para PostgreSQL antes de aplicarse en una base compartida.

## 2026-10-27
- Decisión: el deploy pasa de Railway a Render + Aiven + GitHub Actions, todo gratis (ADR-0009 aceptada, ADR-0006 reemplazada).
- Cambio de nombre del producto: ScoutIAndo pasa a llamarse StatsLine. El repo `tiagomarin1/proyecto-statsline` es un monorepo (`/backend`, `/frontend`, `/docs`).
- Documentación inicial del repo: visión, glosario, modelo canónico, arquitectura, ADR 0001-0008, reglas RN-001 a RN-026, catálogo, specs del MVP v1, contrato de API e integraciones.
- Decisiones: alcance de datos = API-Football; valor de mercado de transfermarkt-datasets en EUR; Score fuera del v1; 4 posiciones; filtros tácticos pases, duelos, recuperaciones y minutos; registro con los campos del prototipo; deploy en Railway.
