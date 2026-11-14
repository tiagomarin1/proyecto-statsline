# ADR-0011: Sportmonks como fuente de rendimiento del ascenso (una fuente por liga)

**Estado:** Propuesta (2026-11-14). Pendiente de validar con el equipo y el PO. **Amplía** ADR-0008 y la regla "alcance de datos = API-Football"; no las reemplaza. ADR-0004 (valor de mercado desde Transfermarkt) sigue igual.

## Contexto
Solo la Liga Profesional tiene métricas completas en API-Football. En el ascenso la API trae a lo sumo minutos, goles y posición (medido el 14/11/2026 en nuestra base):

| Liga | Minutos y partidos | Asistencias, pases, intercepciones y rating | Duelos |
|---|---|---|---|
| Liga Profesional | 89% a 100% | 80% a 100% | 88% |
| Primera Nacional | 74% | 5% | 0% |
| Torneo Federal A | 57% | 4% | 0% |
| Primera B Metropolitana | 56% | 0% | 0% |
| Primera D | 0% | 0% | 0% |
| Primera C | Sin jugadores | — | — |

Se comparó una decena de fuentes (ver `docs/contexto/INVESTIGACION_FUENTES_DATOS.md` y `docs/contexto/FICHA_SPORTMONKS.md`). La única que mejora de forma sustancial el ascenso es Sportmonks. Según su Coverage Finder (14/11/2026): Primera B Nacional y Federal A con nota "Good" (36 y 34 de 38 campos de jugador), B Metropolitana "Basic" (11 de 38), Primera C y D "Basic" (2 de 38).

Dos limitaciones condicionan el diseño:
1. **El rating y los porcentajes de cada proveedor no son comparables entre sí.** Mezclar fuentes dentro de una misma liga, o comparar sin avisar jugadores de fuentes distintas, daría números engañosos.
2. **La trayectoria de los jugadores** (clubes y temporadas) está probada con API-Football en las 6 ligas (con 2 o más clubes en el 42% al 75% de los jugadores, según la liga). En Sportmonks no se confirmó que haya transferencias del ascenso, y Transfermarkt la tiene solo para la Liga Profesional (73%).

## Opciones consideradas
1. **Seguir solo con API-Football:** sin cambios, pero el ascenso queda casi sin métricas.
2. **Reemplazar API-Football por Sportmonks en todo:** una sola fuente y comparable entre ligas, pero la trayectoria no está confirmada, hay que reescribir la sincronización y la migración de IDs es riesgosa.
3. **Una fuente por liga (elegida):** cada liga sale de una sola fuente, así que dentro de la liga todo es comparable.
4. **TheStatsAPI:** cubre solo Liga Profesional y Primera Nacional, USD 50 por mes, sin trayectoria. Se descartó para el rendimiento; queda como opción para contrato y valor de mercado si una prueba lo confirma.
5. **FootyStats, Goalserve, BeSoccer, OpenFoot, TheSportsDB:** descartadas (sin pases, duelos ni rating, o sin cobertura confirmada, o con precio desproporcionado).

## Decisión
Opción 3, una fuente por liga:

| Dato | Fuente |
|---|---|
| Rendimiento de la **Liga Profesional** | API-Football (como hoy) |
| Rendimiento de **Primera Nacional, Federal A, B Metropolitana, Primera C y Primera D** | **Sportmonks**, plan Starter (EUR 29 por mes, 5 ligas, sin add-ons) |
| **Trayectoria** de todos los jugadores | API-Football (`/players/teams` y `/transfers`), spec DAT-004 |
| **Valor de mercado** | transfermarkt-datasets (ADR-0004) |

Reglas de diseño:
- **Cada liga tiene una sola fuente** (`liga.fuente`). No se mezclan fuentes dentro de una liga (RN-029, propuesta).
- La sincronización de Sportmonks es un CLI aparte (`python -m app.sincronizacion.sportmonks`), con el mismo esquema que DAT-001 (ADR-0008): batch a PostgreSQL, sin llamadas en vivo y sin pérdida de datos si falla (RN-025).
- Los jugadores de Sportmonks se **cruzan con la base por nombre y fecha de nacimiento** (RN-030, propuesta) para no duplicar a quien pasa de una liga a otra.
- La interfaz **indica la fuente** de las métricas de cada ficha y avisa cuando se comparan jugadores de fuentes distintas (RN-029).

**Condición para aceptarla:** una prueba de 14 días de Sportmonks con estos criterios (resultado a registrar en esta ADR):

| Prueba | Para pasar |
|---|---|
| Traer todos los jugadores de Primera B Nacional 2026 | Al menos el 90% de los que tiene API-Football (1.673) |
| Cruzar por nombre y fecha de nacimiento con nuestra base | Al menos 90% en Primera Nacional y Federal A |
| 30 jugadores con más minutos por liga (Primera Nacional y Federal A) | Rating, pases, duelos e intercepciones llenos en al menos el 80% |
| Cantidad de pedidos de una sincronización completa | Dentro del límite de 2.000 por hora y por entidad |

Si falla, se vuelve a la opción 1 y esta ADR pasa a "Rechazada".

## Consecuencias
+ Primera Nacional y Federal A pasan de tener solo minutos a tener asistencias, % de pases, intercepciones y rating.
+ Dentro de cada liga, las métricas son comparables.
+ No se pierde nada de lo que hoy da API-Football.
+ El costo adicional es de EUR 29 por mes. Hoy API-Football cuesta USD 19.
- **Dos fuentes que mantener**, con dos clientes, dos conjuntos de fixtures y dos claves (`SPORTMONKS_TOKEN` en el `.env`, nunca en el repo).
- **No se pueden comparar por rating** jugadores de la Liga Profesional con jugadores del ascenso. Hay que mostrarlo en la interfaz.
- **Migración de IDs:** hay que agregar `id_sportmonks` a liga, equipo y jugador, y cruzar los jugadores existentes. El cruce por nombre falla en parte, como con Transfermarkt (RN-002).
- **Cambio en la forma de traer los datos:** Sportmonks no tiene una llamada que devuelva todos los jugadores de una liga y temporada. Hay que pedir equipos de la temporada y estadísticas por participante (estimación: 150 a 300 pedidos por sincronización completa).
- **Riesgo legal pendiente:** los términos de Sportmonks dicen que los materiales del sitio son "para uso personal y no comercial" y a la vez permiten apps con ingresos. Hay que consultarles por escrito antes de salir a producción.
- **Primera C y Primera D** seguirán casi sin datos de rendimiento (solo goles y tarjetas rojas). RN-028 se revisa con esto.
- **Fechas:** MVP v2 el 16/11/2026 (no se toca la fuente de datos antes). API-Football Pro vence el 28/11/2026.
