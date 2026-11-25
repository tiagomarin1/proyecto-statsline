# PROMPT_TERMINAR_MVP.md

Prompt para pegar en la sesión de Claude Code de Santi. Armado el 25/11/2026 con lo que había en el repo y en los PRs. Todo lo que sigue a la línea de abajo es el prompt.

---

Sos el Claude Code de Santi en el repo tiagomarin1/proyecto-statsline (StatsLine, Equipo 04, UADE). Leé primero CLAUDE.md y respetalo: no se escribe código sin spec que cumpla docs/DEFINITION_OF_READY.md, no se inventan reglas de negocio (se proponen en REGLAS_DE_NEGOCIO.md como "(propuesta)" y se pide validación), todo en español, TDD (test rojo, código, refactor), commits "<ID>: <qué hace>", y no se cambia sin aprobación explícita el modelo canónico, ENGINEERING_STANDARDS.md, las migraciones ya aplicadas ni las ADR aceptadas. Un PR por tarea. No metas secretos en el repo: los tokens van solo en backend/.env.

Objetivo: terminar el MVP. Hacé las tareas en este orden. Antes de empezar, corré git pull de main y mirá los PRs abiertos (#33 INF-002 y el PR de las grabaciones de Sportmonks que Tiago subió desde otra sesión, si ya está), porque el estado puede haber cambiado desde que se armó este prompt.

## 0. Urgente: vencimientos

- La prueba de 14 días de Sportmonks empezó alrededor del 14/11 y vence alrededor del 28/11. Hay que grabar las respuestas y probar la sincronización antes.
- La suscripción de API-Football Pro vence el 28/11/2026. Antes de esa fecha hay que correr las sincronizaciones de DAT-001 y DAT-004 contra la base de producción y confirmar que quedó todo cargado.

## 1. La app de Render no levanta

https://statsline-4dyy.onrender.com se queda en "your app is almost live" y /api/v1/salud no responde (visto el 22/11). El CMD del Dockerfile corre app.preparar_base (bloqueo de PostgreSQL de hasta 300 s, migraciones y semillas) antes de uvicorn, así que si eso se cuelga o falla, el servicio nunca abre el puerto.

- Revisá en el panel de Render los Logs y Events del servicio statsline: buscá Traceback, OperationalError, could not connect, timeout o lock.
- Causas probables: la base de Aiven apagada o sin cupo, DATABASE_URL o DATABASE_SSL_CA cambiados, un bloqueo colgado de un deploy anterior, una migración o semilla que falla en producción, o variables de entorno faltantes (SECRET_KEY, DEMO_CONTRASENA, DATABASE_URL).
- Arreglalo y verificá que /api/v1/salud responda ok con la base. Reiniciar, redesplegar o cambiar variables de producción lo decide una persona del equipo, no lo hagas solo.

## 2. DAT-003: sincronizar el ascenso desde Sportmonks

Estado: la spec docs/specs/datos/DAT-003.md sigue en borrador. Ya existen la migración 0002, cliente_sportmonks.py, cruce_sportmonks.py, el script explorar_sportmonks.py y mapeo_sportmonks.py, pero el mapeo parte de un formato equivocado y hay que rehacerlo con las respuestas reales.

- Las grabaciones (backend/grabaciones_sportmonks*/) están fuera de git a propósito, porque Sportmonks no permite redistribuir su feed. Tiago dice que las encontró en otra sesión y las subió en un PR: verificá que no contengan el token ni el feed crudo completo. Si no están, volvé a correr `python -m app.sincronizacion.explorar_sportmonks` con SPORTMONKS_TOKEN en el .env (hay prueba gratis vigente, tope de 2.000 pedidos por hora).
- Rehacé mapeo_sportmonks.py con la forma real. Datos ya medidos: tipos 119 minutos, 118 rating, 1584 porcentaje de pases ya calculado (coincide con acertados sobre totales), IDs de posición 24 a 27 (falta confirmar los nombres contra /core/types). Un dato que falta queda en NULL, nunca en 0 (RN-008, RN-025).
- Armá el comando `python -m app.sincronizacion.sportmonks` para Primera Nacional y Torneo Federal A (flags --liga y --temporada, una transacción por liga, rollback si falla, reintento con 429, token fuera de los mensajes, salida 0 o 1). El listado general /players no filtra por temporada: hay que pedir equipos de la temporada, plantel de cada equipo y estadísticas jugador por jugador (unos 1.400 pedidos para Primera Nacional y 1.050 para Federal A, menos de un pedido por segundo).
- Los fixtures de backend/tests/fixtures/sportmonks/ tienen que ser muestras mínimas y recortadas, no el feed completo.
- Resultado medido de la prueba: solo Primera Nacional y Federal A traen rendimiento (68 % a 84 % de jugadores con datos). Primera B Metropolitana, Primera C y Primera D traen 0 %.
- Decisión abierta con el PO (RN-029): qué fuente usan B Metropolitana, C y D. No la resuelvas por tu cuenta. Preguntale a Tiago qué decidió el PO.
- Actualizá la spec con lo real y pasala a spec-aprobada solo cuando el PO confirme.

## 3. Cerrar las validaciones con el PO y dejarlas escritas

En main siguen como "propuesta" (aunque Tiago dice que el PO ya aprobó algunas): ADR-0011, RN-029, RN-030, RN-031, RN-028, RN-032, RN-033, RN-034 (DAT-004), RN-035 (BUS-010), el mapeo de Forward en RN-019 y el cruce por palabras de RN-002 (paso 2b). Pedile a Tiago la confirmación exacta de cada una, y recién ahí pasá la ADR a Aceptada (con el resultado de la prueba) y las reglas a validadas. No marques nada como aprobado sin esa confirmación.

## 4. Mostrar la fuente de los datos en la interfaz (RN-029)

La ficha tiene que indicar "Datos de Sportmonks" o "Datos de API-Football", y el comparador (y la búsqueda ordenada por rating o % de pases cuando mezcla ligas) tiene que avisar "El rating y los porcentajes vienen de fuentes distintas y no son directamente comparables". La spec de DAT-003 la deja como spec aparte: escribila (BUS, JUG o CMP según corresponda), pedí la decisión de avisar o bloquear (recomendación: avisar), y después implementá con TDD.

## 5. PR #33 (INF-002, test E2E de la demo)

Revisalo. Hay una decisión pendiente del equipo sobre sumar un job e2e al CI (la propuesta recomienda un job en paralelo y la opción de que desplegar espere al e2e recién después de una semana sin inestabilidad). Mergealo solo con el CI en verde.

## 6. Cierre de features en el catálogo

Todas las features P0 y P1 están en "en testing" (solo INF-001 está "hecho"). Cuando el PO valide cada una y los tests estén en verde, pasala a hecho en docs/CATALOGO_DE_FEATURES.md, sumá la línea en docs/CHANGELOG.md y los términos nuevos en docs/GLOSARIO.md, en el mismo commit.

## 7. Pendientes menores

- UI-003: confirmar licencia y autor de las dos fotos del hero antes de publicar.
- UI-001: los colores de éxito, alerta y error son un supuesto que tiene que validar quien diseñó la marca.
- BUS-010: el índice para la búsqueda por nombre cambia el modelo; solo con aprobación.
- Diseño y Trello (EUR, sin Score, 4 posiciones, filtro de minutos, "2 o 3" en la historia de Comparar, métricas de RN-001 en la ficha): pasaselo a Tiago, no se hace desde el repo.

## Al terminar cada tarea

Contame qué quedó hecho, qué quedó bloqueado y por qué, y qué le tengo que preguntar a Tiago o al PO. Si algo depende de una decisión que no está escrita, frená y preguntá.
