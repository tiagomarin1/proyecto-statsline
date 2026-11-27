# CHANGELOG.md

Se agrega una línea cada vez que una feature pasa a `hecho`, en el mismo commit.

## 2026-11-27
- Link nuevo: la app pasa a https://statsline.onrender.com. Render no deja cambiar el subdominio de un servicio existente, así que se creó un servicio nuevo, `statsline`, con la misma base de Aiven, las mismas variables y el health check en `/api/v1/salud`. Se actualizaron el monitor de UptimeRobot y `URL_PUBLICA`. El secret `RENDER_DEPLOY_HOOK` del repo tiene que pasar al deploy hook del servicio nuevo, y después se da de baja `statsline-4dyy`.
- UI-004 hecho: página pública `/terminos` con los términos y condiciones (incluye los derechos de la Ley 25.326), link a los términos desde el registro, y en el pie de todas las páginas "Términos" y "Escribinos por WhatsApp" con el mensaje ya escrito (PR #46).
- JUG-001 y CMP-001: la interfaz deja de mostrar la temporada de los datos en la ficha, el comparador y el panel de detalle; la API la sigue devolviendo (decisión del equipo, PR #47).
- INF-003 hecho: monitor de UptimeRobot (plan gratis) contra `/api/v1/salud` cada **5 minutos**, con alertas por mail. El plan gratis no tiene 20 minutos, y con 5 Render no se duerme nunca y sigue sin costo.
- AUT-003 en producción: Brevo (plan gratis) con un remitente verificado y una clave restringida a emails transaccionales; `BREVO_API_KEY`, `CORREO_REMITENTE` y `URL_PUBLICA` están cargadas en Render. Se probó el mail de recuperación de punta a punta.
- BUS-005: la pantalla Buscar suma "Guardar perfil de búsqueda" y "Cargar perfil guardado", con el resumen "Perfil guardado: Defensor · 20-27 años · Primera Nacional" debajo de los filtros. Hasta ahora solo existía la API (`GET` y `PUT /perfil-busqueda`). Lo obligatorio lo sigue validando el backend (RN-023): si falta posición, liga o rango de edad, se marca el campo y se muestra su mensaje. Guardar con un perfil ya guardado lo reemplaza y avisa "Reemplaza al anterior: en el MVP hay un solo perfil". Cargarlo reemplaza los filtros de la pantalla (el nombre de BUS-010 no es parte del perfil) y conserva el orden. Solo frontend: el contrato de API no cambia. **Pendiente:** la ficha sigue calculando la coincidencia (RN-012) con los filtros de la URL; si se entra sin filtros no usa el perfil guardado.

## 2026-11-26
- **Cierre del MVP (decisión del equipo, Cilento):** pasan a `hecho` DAT-001 a DAT-004, AUT-001 a AUT-003, BUS-001 a BUS-006, BUS-010, JUG-001, JUG-003, CMP-001, CMP-003, SEG-001, UI-001 a UI-003 e INF-002. Todas están mergeadas, con tests en verde, y desplegadas en https://statsline-4dyy.onrender.com. Las reglas que seguían como propuestas (RN-028, RN-031 a RN-035, `Forward` en RN-019 y el paso 2b de RN-002) quedan como decisión del equipo, sin la validación del PO.
- DAT-003: Sportmonks no manda goles, asistencias ni intercepciones cuando valen 0; si el jugador tiene minutos, se guardan en 0 (RN-031, PR #40). Se re-sincronizaron Primera Nacional y Torneo Federal A antes de que venza la prueba (30/11). Los datos quedan congelados: no se paga Sportmonks ni API-Football.
- INF-002: el job `e2e` entra al CI (PR #33), en paralelo con los otros, y `desplegar` todavía no lo espera. Reemplaza el "pendiente" de la línea del 14/11.
- BUS-004: el presupuesto acepta cualquier monto mayor que 0, sin el rango de EUR 20.000 a 400.000 (RN-003, PR #42).
- BUS-006: el orden por rating solo se puede usar con una liga elegida, porque sin liga se mezclan fuentes (RN-029, PR #43). El orden por % de pases no cambia.
- AUT-003: recuperar la contraseña por mail, con un link de 60 minutos y de un solo uso (RN-036, PR #44), mandado por la API de Brevo. Para que el mail salga en producción hay que cargar `BREVO_API_KEY` y `CORREO_REMITENTE` en Render (`docs/SETUP.md`, sección 2c).
- INF-003 (en testing): monitor de UptimeRobot cada 20 minutos para que Render no se duerma, y la sincronización pasa a correrse solo a mano (PR #41).

## 2026-11-16
- INF-002: test E2E del recorrido de la demo con Playwright (`frontend/e2e/`). Recorre ingresar → filtrar → ficha → comparar → seguimiento con el usuario demo, contra la app levantada en local y el seed fijo `semillas/demo_e2e.py`. Se corre con `npx playwright test` desde `frontend/`; lo que hay que tener levantado está en `SETUP.md`. La contraseña sale de `DEMO_CONTRASENA` y el trace queda apagado para que no aparezca en los reportes. No cambia el código de la app. **Pendiente:** decidir si entra al CI; la propuesta está en el PR.

## 2026-11-14
- BUS-010: búsqueda de jugadores por nombre. Buscar suma el campo "Nombre del jugador", que se aplica solo, queda en la URL y tiene su chip; `GET /jugadores` acepta `nombre` (hasta 60 caracteres) y lo combina con los demás filtros. La comparación sigue RN-035 **(propuesta, pendiente de validar con el PO)**: sin tildes ni mayúsculas, contra `nombre`, `nombre_pila` y `apellido`, y cada palabra escrita tiene que ser el comienzo de una palabra del nombre. No cambia el modelo ni hay migraciones; el índice para esta búsqueda queda anotado como pendiente en la spec.
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
