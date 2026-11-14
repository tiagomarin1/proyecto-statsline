# INVESTIGACION_FUENTES_DATOS.md

Comparación de fuentes de datos para StatsLine, hecha el 14/11/2026. Sirve para decidir con el PO si se cambia o se complementa API-Football. **No cambia nada del alcance de datos vigente** (ADR-0004 y ADR-0008): cualquier fuente nueva necesita aprobación explícita y una ADR.

## 1. Para qué se hizo

Hoy los datos de rendimiento salen de **API-Football** (plan Pro) y el valor de mercado de **transfermarkt-datasets**. Dos problemas:

1. Solo la **Liga Profesional** tiene métricas completas. En el ascenso, API-Football trae a lo sumo minutos y posición (`INTEGRACIONES_EXTERNAS.md`, sección 1).
2. El valor de mercado cubre el 72% de la Liga Profesional (860 de 1.199 jugadores) y casi nada del ascenso, porque el dataset solo tiene `ARG1`.

Además se quiere sumar: contrato (fecha de fin), trayectoria del jugador y datos del ascenso.

## 2. Cómo leer este documento

Cada dato lleva una etiqueta de confianza:

| Etiqueta | Qué significa |
|---|---|
| **[medido]** | Lo probamos nosotros con una llamada real o leyendo la herramienta de la fuente con una cuenta nuestra |
| **[documentado]** | Figura en la documentación o en la página oficial del proveedor, sin probarlo |
| **[sin confirmar]** | No pudimos verlo. No se debe asumir ni que sí ni que no |

Limitaciones: salvo API-Football y el Coverage Finder de Sportmonks, no se probó ninguna API con llamadas reales. Varios sitios (FBref, la web de FootyStats, la documentación de API-Football) bloquean la lectura automática y no se saltearon esos bloqueos. Los precios son los publicados en la fecha de consulta y pueden cambiar.

## 3. Qué necesita StatsLine

Por jugador y temporada, para las 6 ligas del MVP (Liga Profesional, Primera Nacional, Primera B Metropolitana, Primera C, Primera D y Torneo Federal A):

- **Para filtros y comparación:** minutos, partidos, goles, asistencias, % de pases completados, duelos ganados, intercepciones o recuperaciones, rating.
- **Para identificar y cruzar:** nombre, fecha de nacimiento, posición, equipo.
- **Para valor y negociación:** valor de mercado (EUR) y fecha de fin de contrato.
- **Para la ficha:** trayectoria (clubes y temporadas).

Restricciones de arquitectura: las pantallas nunca llaman a la API externa (ADR-0008), los datos se sincronizan a PostgreSQL, y un dato faltante se muestra como "Dato no disponible", nunca como 0 (RN-008).

## 4. Resumen ejecutivo

1. **Ninguna fuente cubre las 6 ligas con todo.** La Liga Profesional ya está resuelta con API-Football. El hueco real es el ascenso.
2. **Sportmonks es la mejora más grande para el ascenso**, pero solo para dos ligas: **Primera B Nacional** (nota "Good", 36 de 38 campos de jugador) y **Torneo Federal A** (nota "Good", 34 de 38). Agregaría goles, asistencias, pases, intercepciones, tackles y rating donde hoy hay solo minutos. [medido]
3. **Primera B Metropolitana, Primera C y Primera D no se resuelven con ninguna fuente confirmada.** En Sportmonks la nota es "Basic": 11 de 38 campos en B Metropolitana (sin asistencias, pases ni rating) y 2 de 38 en C y D (solo goles y tarjetas rojas, ni siquiera minutos). [medido]
4. **Valor de mercado y contrato del ascenso: no hay fuente confirmada.** TheStatsAPI es la única que menciona fin de contrato y valor de mercado en su endpoint de plantel, pero no se confirmó que lo traiga en ligas menores. [documentado]
5. **La trayectoria ya está resuelta con API-Football**, incluso en el ascenso. [medido]
6. **Scraping descartado.** Sofascore, FotMob, Transfermarkt (web) y FootyStats (web) lo prohíben o bloquean los accesos automáticos.

## 5. Comparación general

| Fuente | Ligas argentinas | Métricas de jugador | Valor de mercado / contrato | Trayectoria | Acceso | Costo | Prueba gratuita |
|---|---|---|---|---|---|---|---|
| **API-Football** (actual) | Las 6 [medido] | Completas solo en Liga Profesional; ascenso: minutos y posición [medido] | No | **Sí** [medido] | API | USD 19/mes (Pro) | Plan gratis, 100 pedidos/día |
| **Sportmonks** | Las 6 en catálogo [medido]; ver sección 6.2 | Liga Prof., Primera B Nacional y Federal A: casi completas [medido] | No figura | Endpoints de transferencias [documentado] | API | EUR 29 / 99 / 249 por mes | 14 días, con tarjeta |
| **TheStatsAPI** | Liga Profesional (7 temporadas) y Primera Nacional (2) con estadísticas de jugador; las demás "a pedido" [medido] | Minutos, rating, goles, asistencias, duelos, pases y defensa por grupo; campos exactos sin confirmar [documentado] | Plantel menciona valor de mercado y fin de contrato; cobertura en ligas menores sin confirmar [documentado] | No | API | USD 50 / 129 / 379 por mes | 7 días |
| **FootyStats** | Las 6 listadas; datos de jugador en ligas menores sin confirmar [documentado] | 65 campos: minutos, goles, asistencias, tarjetas, altura. **Sin pases, duelos, recuperaciones ni rating** [medido] | No | No | API | £29,99 / 69,99 / 389,99 por mes | Solo Premier League |
| **Goalserve** | Primera División, Argentino A y B, Prim B Metro, Prim B Nacional, Prim C Metro y Prim D Metro; Federal A y Liga Profesional por nombre, sin confirmar [documentado] | Mayormente en vivo; agregados por temporada sin confirmar | No figura | No confirmada | API | Desde USD 150 por mes | 30 días |
| **BeSoccer** | Sin confirmar | Solo rankings de goleadores y asistentes [documentado] | Valor de mercado en su aviso legal, no en la API [documentado] | Endpoints de trayectoria y fichajes [documentado] | API | Sin precio publicado | Cuenta de prueba a pedido |
| **OpenFoot** | Solo Liga Profesional y Primera Nacional [documentado] | No hay estadísticas de jugador por temporada | No | No | API | Gratis (5.000 pedidos/mes), USD 14 y 39 | No hace falta |
| **TheSportsDB** | Sin confirmar | Sin confirmar | Endpoint de contratos sin campos documentados | Clubes anteriores (sin confirmar cobertura) | API | Gratis limitado, USD 9/mes | Gratis |
| **BDFA** (web) | **Todo el ascenso** [documentado] | Partidos y goles por temporada | No | **Sí, por club y temporada** | Solo web | Gratis | — |
| **Wikidata** | Sin verificar | No | No | En teoría (propiedad "miembro del equipo deportivo") | Descarga y consultas | Gratis (CC0) | — |

## 6. Detalle por fuente

### 6.1 API-Football (la actual, línea base)

- Plan Pro, USD 19 por mes, 7.500 pedidos por día. La sincronización de las 6 ligas gastó unos 360 pedidos el 14/11/2026. [medido]
- Jugadores sincronizados: Liga Profesional 1.203 (cobertura completa), Primera Nacional 1.673, Primera B Metropolitana 1.021, Torneo Federal A 1.625, Primera D 142, Primera C 0. En todas menos la Liga Profesional, solo minutos y posición. [medido]
- **Trayectoria:** `/players/teams?player=ID` devuelve clubes y temporadas (probado con un jugador de Primera B Metropolitana: 6 clubes entre 2008 y 2025). `/transfers?team=ID` devuelve todas las transferencias de un club en un pedido (134 clubes en nuestra base). [medido]
  - Costo estimado de la carga inicial: unos 5.300 pedidos para los clubes de cada jugador más unos 134 para transferencias. Entra en el cupo de un día, pero conviene repartirlo en 2 o 3.
  - Los juveniles formados en un club tienen poco historial. Las selecciones aparecen como si fueran clubes.
- **Plan gratis:** 100 pedidos por día; el límite por minuto y las temporadas permitidas no se confirmaron, porque su página de precios bloquea la lectura automática. [sin confirmar]
- No trae valor de mercado ni contrato. [documentado]

### 6.1.0 Cobertura de trayectoria en API-Football por liga [medido el 14/11/2026]

Muestra al azar de 40 jugadores por liga, con `/players/teams` (clubes y temporadas) y `/transfers`. Se usaron 400 pedidos. Las selecciones no se cuentan como clubes. **Con 40 jugadores por liga el margen de error es de unos ±15 puntos.**

| Liga | Muestra | Con 2 o más clubes | Con 3 o más | Mediana de clubes | Con registro de transferencias |
|---|---|---|---|---|---|
| Liga Profesional | 40 | 75% | 60% | 3 | 75% |
| Primera Nacional | 40 | 70% | 60% | 3 | 75% |
| Primera B Metropolitana | 40 | 68% | 58% | 3 | 70% |
| Torneo Federal A | 40 | 52% | 40% | 2 | 55% |
| Primera D | 40 | 42% | 15% | 1 | 55% |
| Primera C | — | Sin jugadores en la base | — | — | — |

- El 100% de los jugadores tiene al menos un club (el actual). Lo útil es el historial: que haya 2 o más clubes. Un jugador con un solo club puede ser real (por ejemplo, un juvenil formado ahí) y no un hueco de datos.
- **API-Football cubre mucho mejor el ascenso que Transfermarkt** (sección 6.1.1: Primera Nacional 6%, B Metropolitana 1%, Federal A 0,1%).
- La trayectoria de Primera D y Federal A es más corta. La de Primera D viene de la temporada 2023.
- Algunos clubes aparecen sin temporadas (`None`): hay que mostrarlos sin años o descartarlos.

### 6.1.1 Trayectoria desde transfermarkt-datasets (`transfers.csv.gz`) [medido el 14/11/2026]

Se descargó `transfers.csv.gz` (5,8 MB, mismo bucket que `players.csv.gz`) y se cruzó con nuestra base por `id_transfermarkt`.

- **Qué trae:** 175.165 transferencias de 23.379 jugadores, con `transfer_date`, `from_club_name`, `to_club_name`, `transfer_fee` y `market_value_in_eur`. Incluye pasos por clubes menores y de juveniles (por ejemplo, de la reserva al primer equipo).
- **El límite:** solo hay trayectoria para los jugadores que ya cruzamos con Transfermarkt (1.037 de 5.295). **895 jugadores (16,9%) tienen transferencias.**

| Liga | Jugadores en la base | Con trayectoria en Transfermarkt |
|---|---|---|
| Liga Profesional | 1.203 | 873 (73%) |
| Primera Nacional | 1.673 | 98 (6%) |
| Primera B Metropolitana | 1.021 | 11 (1%) |
| Primera D | 142 | 1 (1%) |
| Torneo Federal A | 1.625 | 2 (0,1%) |

- En la Liga Profesional la trayectoria es buena: promedio de 6,8 transferencias por jugador entre los que tienen datos.
- **En el ascenso casi no hay**, porque el dataset solo incluye jugadores que pasaron por las competiciones que cubre. Un jugador de Primera B Metropolitana con 6 clubes entre 2008 y 2025 en API-Football no tiene ninguna entrada en Transfermarkt.
- **Calidad:** hay ruido que filtrar: 475 filas con fecha posterior a hoy (fin de contrato o de préstamo), idas y vueltas de préstamos, pasos "Without Club" y movimientos entre equipos juveniles y reserva. La actualización del dataset está pausada desde julio de 2026.
- **Conclusión:** sirve como complemento de la Liga Profesional (y aporta tarifas y valores), pero **no resuelve la trayectoria del ascenso**.

### 6.2 Sportmonks

**Planes** [documentado, leído en la página de precios]:

| Plan | Mensual | Ligas | Límite |
|---|---|---|---|
| Starter | EUR 29 | 5 a elección | 2.000 pedidos por entidad y por hora |
| Growth | EUR 99 | 30 | 2.500 |
| Pro | EUR 249 | 120 | 3.000 |
| Enterprise | A medida | Todas (2.300+) | 5.000 |

- **Todos los planes incluyen las mismas funciones**; cambian las ligas y el límite. Pago anual con descuento (hasta 20% según la página).
- Add-ons: ligas extra desde EUR 4 por mes; historial de más de tres temporadas, EUR 29 por única vez; xG, desde EUR 29 por mes.
- Prueba de 14 días, una sola vez, con tarjeta (si no se cancela, cobra).
- Términos: la reventa de datos no está permitida; la cuenta no se comparte; los datos se licencian por dominio; ley de los Países Bajos. Sin cláusulas de caché ni atribución encontradas. Hay una aparente contradicción entre "uso personal y no comercial" de los materiales del sitio y la permisión de apps con ingresos: **consultar con Sportmonks antes de producción.**

**Cobertura por liga** [medido en el Coverage Finder el 14/11/2026, con una cuenta gratuita]:

| Liga | Nota | Campos de jugador | Minutos | Goles | Asist. | Pases | Interc. y tackles | Rating | Duelos |
|---|---|---|---|---|---|---|---|---|---|
| Liga Profesional de Fútbol (#636) | Excellent | 36 de 38 | Sí | Sí | Sí | Sí, con % hecho | Sí | Sí | Sí |
| Primera B Nacional (#645) | Good | 36 de 38 | Sí | Sí | Sí | Sí, % calculable | Sí | Sí | Parcial |
| Torneo Federal A (#1333) | Good | 34 de 38 | Sí | Sí | Sí | Sí, % calculable | Sí | Sí | Parcial |
| Primera B Metropolitana (#1330) | Basic | 11 de 38 | Sí | Sí | No | No | No | No | No |
| Primera C (#1093) | Basic | 2 de 38 | No | Sí | No | No | No | No | No |
| Primera D Metropolitana (#1094) | Basic | 2 de 38 | No | Sí | No | No | No | No | No |

- **Perfil del jugador en las 6 ligas (8 de 8 campos):** fecha de nacimiento, posición, posición detallada, altura, peso, nacionalidad, ciudad y país. Permite cruzar jugadores por nombre y fecha de nacimiento, como en RN-002.
- **% de pases:** en Primera B Nacional y Federal A no viene calculado, pero se obtiene de `Passes` y `Successful Passes`. Sería una regla de derivación nueva.
- **Duelos:** `Duels` aparece a nivel de jugador, pero en alineaciones `Duels` y `Total Duels` no están cubiertos. Si trae duelos ganados y totales hay que verlo en una llamada real.
- **Ningún módulo de transferencias, valor de mercado ni contrato** en las 9 categorías del buscador. La documentación menciona endpoints de transferencias [documentado] sin detalle de campos.
- **Limitación:** el buscador muestra qué campos se publican por liga, no si cada jugador tiene el valor lleno.

### 6.2.1 ¿Puede Sportmonks reemplazar a API-Football?

Comparación punto por punto de lo que hoy hace DAT-001 con API-Football, contra lo que se puede hacer con Sportmonks según su documentación pública (leída el 14/11/2026) y el Coverage Finder. **Ninguna de estas filas se probó con llamadas reales**: eso se hace en la prueba de 14 días (sección 10).

| # | Lo que hace hoy API-Football | Sportmonks | Veredicto |
|---|---|---|---|
| 1 | Listar las temporadas de una liga y elegir la de RN-027 | `GET /seasons` con filtro por liga y el campo `is_current`. No hay un endpoint de "temporada actual": se filtra en el cliente [documentado] | Sí, con trabajo |
| 2 | Traer todos los jugadores de una liga y temporada con sus estadísticas (`/players?league&season&page`, 20 por página, unos 360 pedidos en total) | **No hay una llamada única.** Ruta documentada: equipos de la temporada (`/teams/seasons/{id}`), y estadísticas de temporada por participante (`/statistics/seasons/{participant}/{id}`, hasta 50 por página) o plantel por equipo [documentado]. Estimación de pedidos por sincronización completa: del orden de 150 a 300 (sin probar) | Sí, pero distinto. A confirmar con la prueba |
| 3 | Datos del jugador: nombre, apellido, nacimiento, nacionalidad, posición | `firstname`, `lastname`, `name`, `date_of_birth`, `height`, `weight`. Nacionalidad y posición vienen como IDs que hay que traducir con includes. Las unidades de altura y peso no están documentadas [documentado] | Sí, con una tabla de traducción de posiciones (RN-019) |
| 4 | Estadísticas de temporada: minutos, partidos, goles, asistencias, % de pases, duelos, intercepciones, rating | Tipos `minutes-played`, `appearances`, `goals`, `assists`, `passes`, `accurate-passes`, `accurate-passes-percentage`, `total-duels`, `duels-won`, `interceptions`, `tackles`, `rating` [documentado]. Calidad por liga [medido]: Liga Profesional 36 de 38, Primera B Nacional 36 de 38, Federal A 34 de 38, B Metropolitana 11 de 38, Primera C y D 2 de 38 | **Sí en las 3 primeras ligas. En las otras 3 iguala o supera a API-Football** (que tampoco tiene ahí más que minutos y posición) |
| 5 | Un jugador en dos equipos de la misma temporada (RN-017) | Una fila por jugador, equipo y temporada: es el mismo modelo [documentado] | Sí |
| 6 | **Trayectoria** (`/players/teams`, `/transfers`), probada también en el ascenso | `GET /transfers/players/{id}` (fecha, equipo de origen y destino, tipo libre, préstamo o traspaso, monto) y `GET /transfers/teams/{id}`; el include `teams.team` del jugador trae fechas de inicio y fin [documentado]. **El Coverage Finder no tiene ningún módulo de transferencias**, no se sabe si están en el ascenso argentino ni si entran en la ventana de 3 temporadas | **Sin confirmar. Es el punto que puede obligar a combinar** |
| 7 | Cupo: 7.500 pedidos por día | 2.000 por hora por entidad en el Starter [documentado] | Sí |
| 8 | IDs de jugador y equipo | La documentación no dice que sean estables. Habría que agregar `id_sportmonks` a `jugador` y `equipo` y cruzar los 5.295 jugadores actuales por nombre y fecha de nacimiento para no perder seguimientos y perfiles guardados | Sin confirmar. Migración con riesgo moderado |
| 9 | Temporadas viejas (RN-027 prueba hasta 3) | Sin el add-on de historial, las 3 temporadas más recientes de cada liga suscrita [documentado] | Sí |

**Extras que Sportmonks podría traer y API-Football no:** fecha de inicio y fin de contrato en el plantel (`start` y `end` de Team Squad, a probar si vienen llenos), pie hábil (`metadata`, no siempre poblado), altura, peso y tarjetas. No hay valor de mercado.

**Dos advertencias para decidir:**
1. **El rating y los porcentajes de cada proveedor no son comparables entre sí.** Si se combinan las dos fuentes (por ejemplo, API-Football para la Liga Profesional y Sportmonks para el ascenso), el rating de un jugador de Primera Nacional no se puede comparar con el de uno de la Liga Profesional. Esto favorece usar **una sola fuente** para todas las ligas.
2. **Las ligas del plan.** El Starter incluye 5 ligas. Primera C tiene hoy 0 jugadores en API-Football y 2 campos en Sportmonks, así que se puede dejar afuera sin perder nada. Con eso, el Starter (EUR 29) cubre Liga Profesional, Primera Nacional, Federal A, B Metropolitana y Primera D.

### 6.2.2 Qué suma Sportmonks por liga respecto de API-Football

Lo de API-Football es **medido en nuestra base** (porcentaje de jugadores con el dato cargado, 14/11/2026). Lo de Sportmonks es **medido en el Coverage Finder** (campos que la liga publica, no el porcentaje de jugadores con valor). Los números no son comparables uno a uno.

| Liga | API-Football hoy (jugadores con el dato) | Lo que Sportmonks suma | Sigue sin cubrirse |
|---|---|---|---|
| **Liga Profesional** | Partidos 100%, minutos 89%, goles 100%, asistencias 100%, pases 83%, duelos 88%, intercepciones 80%, rating 89% | Nada esencial. Extras: tarjetas, tackles, remates, regates, centros, altura y peso | — |
| **Primera Nacional** | Minutos, partidos y goles 74%; asistencias, pases, intercepciones y rating 5%; duelos 0% | **Asistencias, % de pases, intercepciones, tackles y rating.** Duelos de forma parcial. Más tarjetas y remates | Cobertura de duelos ganados, a confirmar |
| **Torneo Federal A** | Minutos, partidos y goles 57%; asistencias, pases, intercepciones y rating 4%; duelos 0% | **Asistencias, % de pases, intercepciones, tackles y rating.** Duelos de forma parcial. Más tarjetas y remates | Ídem |
| **Primera B Metropolitana** | Minutos, partidos y goles 56%; todo lo demás 0% | Titularidades, suplente, cambios, tarjetas amarillas y rojas, penales, vallas invictas y goles recibidos. **No suma** asistencias, pases, intercepciones, duelos ni rating | Asistencias, pases, duelos, intercepciones y rating |
| **Primera C** | **0 jugadores** (la API marca la liga sin cobertura de jugadores) | Perfil de jugadores (nacimiento, posición, altura, peso), goles y tarjetas rojas, si hay planteles cargados | Minutos y todas las métricas de rendimiento |
| **Primera D** | 142 jugadores de la temporada 2023, solo posición | Perfil actualizado, goles y tarjetas rojas | Minutos y todas las métricas de rendimiento |

- **Goles en el ascenso:** API-Football sí trae goles reales en el ascenso (por ejemplo, 511 goles en 1.378 jugadores de Primera Nacional), pero solo para los jugadores con minutos cargados.
- **Asistencias:** en el ascenso casi no hay con API-Football (14 jugadores en Primera Nacional, 3 en Federal A, 0 en B Metropolitana).
- **Nada que API-Football dé y Sportmonks no**, salvo la trayectoria, sin confirmar en Sportmonks.
- **Extras de perfil en las 6 ligas (Sportmonks):** altura, peso, ciudad y país de nacimiento; pie hábil y fechas de contrato en los planteles, a probar si vienen llenos.

### 6.3 TheStatsAPI

- Cobertura por defecto en Argentina [medido en su tabla de cobertura]: Campeonato de Reserva, Copa Argentina, **Liga Profesional (7 temporadas)** y **Primera Nacional (2 temporadas)**, las cuatro con estadísticas de jugador. Las demás ligas, a pedido.
- Perfil del jugador: nombre, posición, fecha de nacimiento, edad, nacionalidad, altura y equipo. Estadísticas de temporada: partidos, titularidades, minutos, rating, goles, asistencias, remates, pases, defensa, duelos y disciplina (campos exactos sin confirmar). [documentado]
- **Plantel de un equipo (`/teams/{id}/players`, hasta 100 jugadores):** menciona pie hábil, **fecha de fin de contrato y valor de mercado**. No se confirmó que lo traiga en divisiones menores. [documentado]
- **Verificado en el panel de una cuenta gratuita (14/11/2026)** [medido]:
  - El catálogo de Argentina tiene exactamente **4 competiciones**: Campeonato de Reserva, Copa Argentina, Liga Profesional de Fútbol y Primera Nacional. Primera B Metropolitana, Primera C, Primera D y Torneo Federal A **no están** (la búsqueda de "Federal" devuelve 0).
  - Primera Nacional tiene solo 2 temporadas (2026 en curso y 2025).
  - El plantel de Chacarita Juniors (Primera Nacional) trae 42 jugadores, con duplicados (un mismo nombre y dorsal con dos IDs) y nombres incompletos: hay que contar con problemas de calidad en ligas menores.
  - La clave de API existe pero **solo funciona con un plan o prueba activos**. No se inició la prueba, así que no se hicieron llamadas reales.
- **Campos del endpoint de plantel** (`GET /football/teams/{team_id}/players`, según el ejemplo de respuesta del probador) [documentado]: `date_of_birth`, `age`, `position`, `nationality`, `height_cm`, `preferred_foot`, **`market_value`** (número) y **`contract_until`** (fecha), más el equipo actual y la selección. El ejemplo es de un jugador de la Premier League; **no se sabe si vienen llenos en Primera Nacional**.
- **Campos de estadísticas de temporada de un jugador** (`GET /football/players/{id}/stats`, mismo origen) [documentado]: `rating`, `appearances`, `starts`, `minutes_played`; `scoring` (goles, asistencias, xG, xA); `passing` (`total_passes`, `accurate_passes`, **`pass_accuracy`** ya en %, `key_passes`); `duels` (**`total_duels_won_percentage`** ya en %, aéreos y de suelo); `defending` (`tackles`, `interceptions`); `discipline` (tarjetas). Coincide casi uno a uno con las métricas de StatsLine, sin cálculos propios. Los valores del ejemplo son de relleno (ceros): no prueban cobertura.
- **No tiene endpoints de transferencias ni de trayectoria** (son 35 endpoints en total): la trayectoria sigue saliendo de API-Football.
- Planes: USD 50 (100.000 pedidos/mes), 129 (500.000), 379 (5.000.000). Prueba de 7 días en todos. Reembolso de 14 días en planes pagos. [documentado]
- **Términos:** prohíbe revender datos y publicarlos como base, y **prohíbe guardarlos "más allá de lo razonablemente necesario para operar la aplicación"**. Eso se cruza con el diseño de StatsLine (sincronizar a PostgreSQL). Pedirles confirmación por escrito antes de usarla. [documentado]
- Un `403 ADDON_REQUIRED` en la documentación indica que algunos endpoints podrían requerir un add-on. [sin confirmar]

### 6.4 FootyStats

- Planes de la API [documentado]: Free (solo Premier League, 180 pedidos/hora), Hobby £29,99 (50 ligas, 1.800/hora), Serious £69,99 (150 ligas), Everything £389,99 (todas, 4.500/hora).
- Lista todas las ligas argentinas, incluidas Primera C, Primera D y Federal A. Qué datos de jugador tienen las ligas menores no se pudo confirmar.
- **Los 65 campos de jugador** [medido en la página oficial de la API]: identidad (nombre, edad, nacimiento, nacionalidad, altura, peso, posición, club) y rendimiento (minutos, partidos, goles, asistencias, penales, tarjetas, vallas invictas, goles recibidos, métricas por 90 minutos y rankings). **No hay pases, duelos, recuperaciones, rating, valor de mercado ni contrato.**
- Su web muestra valores de mercado de la Primera B Nacional, pero ese dato no figura entre los campos de la API.
- **Términos** [documentado, vía buscador; la página bloquea la lectura automática]: prohíben el scraping del sitio; la API es el camino permitido. Pueden haber cambiado.
- Conclusión: no reemplaza a API-Football y no resuelve ninguna de las faltas principales.

### 6.5 Goalserve

- Listado de Argentina [documentado]: Primera División, Argentino A, Argentino B, Copa Argentina, Prim B Metro, Prim B Nacional, Prim C Metro, Prim D Metro. "Liga Profesional" y "Torneo Federal A" no aparecen por nombre.
- Orientado a datos en vivo: estadísticas de jugador "en juego" y desde 2016; agregados por temporada sin confirmar.
- Precios publicados (USD, sin moneda explícita): desde 150 por mes (Live Score) y hasta 550 por mes (paquete completo de fútbol). Prueba de 30 días.
- Términos: plantilla genérica de comercio electrónico, sin cláusula de licencia de datos. Última actualización 30/11/2020.
- Conclusión: caro para lo que aporta y sin confirmar los datos que necesitamos.

### 6.6 BeSoccer

- Sin precios publicados: se contrata por email. La página dice que no hay cuentas gratuitas, y su aviso legal dice que se desactivan a los 7 días: contradicción. [documentado]
- Endpoints de trayectoria, fichajes y lesiones. Valor de mercado figura solo como dato que tratan en el aviso legal. Ligas argentinas y campos de jugador sin confirmar (su documentación devolvió un error 500).

### 6.7 OpenFoot

- Cubre solo Liga Profesional y Primera Nacional. No documenta estadísticas de jugador por temporada, valor ni contrato. [documentado]
- Gratis (5.000 pedidos por mes). Los términos permiten guardar los datos para uso interno.
- Conclusión: no sirve para StatsLine.

### 6.8 TheSportsDB

- Gratis limitado (30 pedidos por minuto) y planes de USD 9 y 20 por mes. Tiene endpoints de jugadores, clubes anteriores y contratos, pero sin campos documentados y sin confirmar cobertura argentina.
- Permite copiar lo que devuelven sus endpoints oficiales, pero no publicar apps en tiendas con el plan gratis.

### 6.9 BDFA (bdfa.com.ar)

- Cubre Primera B, Federal A, Primera C, Primera D y Federal B, con fichas por jugador (clubes, temporadas, partidos y goles) y vista cronológica. Se verificó en una ficha de ejemplo. [documentado]
- **Sin API ni descargas.** No encontramos términos de uso; dicen ser "un proyecto realizado y actualizado a pulmón" y que "toda nuestra información es gratuita".
- Opción: escribirles para pedir autorización o una colaboración. No se debe extraer por scraping sin su permiso.

### 6.10 Wikidata

- Licencia CC0. La propiedad "miembro del equipo deportivo" (P54) admite fechas de inicio y fin, útil para trayectoria. No se verificó cuántos jugadores del ascenso argentino hay cargados. [sin confirmar]

### 6.11 Descartadas o sin verificar

| Fuente | Motivo |
|---|---|
| Sofascore, FotMob, Soccerway, Transfermarkt (web) | Sin API oficial; sus términos prohíben la extracción o bloquean los accesos automáticos |
| FBref | La lectura automática dio 403: no se pudo ver su cobertura argentina ni su política de uso |
| Wyscout, InStat, Opta, Sportradar | Plataformas profesionales de pago; no hay cobertura ni precios públicos |
| football-data.org | Su plan gratis cubre ligas europeas, sin Argentina |
| FootballTransfers | Solo primera división |
| Scrapers de Apify y similares | Mismo problema de términos de uso; los valores de ligas menores suelen venir vacíos |

## 7. Hallazgos clave

1. **El ascenso se parte en tres grupos.** Con Sportmonks, Primera B Nacional y Federal A quedan casi como la Liga Profesional. Primera B Metropolitana queda a medias. Primera C y D siguen sin métricas de rendimiento (RN-028 sigue pendiente).
2. **Contrato y valor de mercado no tienen solución confirmada para el ascenso.** La alternativa más barata es un campo "contrato hasta" cargado a mano por el usuario en la lista de seguimiento.
3. **La trayectoria no necesita fuente nueva**: sale de API-Football.
4. **Cualquier fuente nueva requiere decisiones del equipo** (sección 9).

## 8. Escenarios de costo mensual

| Escenario | Qué se tiene | Costo |
|---|---|---|
| A. Estado actual | API-Football Pro + Transfermarkt (archivo) | USD 19 |
| B. A + Sportmonks Starter | Sube Primera B Nacional y Federal A. Las 5 ligas del plan pueden ser Liga Profesional, Primera B Nacional, Federal A, Primera B Metropolitana y una más; Primera C y D no aportan | USD 19 + EUR 29 |
| C. A + TheStatsAPI | Contrato y valor de mercado de Liga Profesional y Primera Nacional, si la prueba lo confirma | USD 19 + USD 50 |
| D. B + C | Todo lo anterior | Suma de ambos |

FootyStats, Goalserve y BeSoccer no se incluyen en los escenarios: no resuelven las faltas principales o no se pudo confirmar su cobertura.

## 9. Decisiones que necesita el equipo y el PO

- **Alcance de datos.** Sumar una fuente de rendimiento amplía ADR-0004 y ADR-0008. Hace falta una ADR nueva.
- **Modelo canónico.** Agregar identificadores de la fuente nueva (`id_sportmonks`), la trayectoria y, si se quiere, tarjetas, altura y peso. Requiere aprobación explícita.
- **Reglas de negocio nuevas (propuestas, a validar):**
  - qué fuente manda para cada liga cuando coinciden dos (por ejemplo, API-Football para la Liga Profesional y Sportmonks para el ascenso);
  - cómo se calcula el % de pases a partir de pases acertados y totales;
  - cómo se muestran Primera B Metropolitana, Primera C y D con métricas parciales (RN-028).
- **Legal.** Confirmar por escrito con Sportmonks (uso en una app con ingresos y almacenamiento) y, si se usa, con TheStatsAPI (cláusula de caché).

## 10. Qué falta verificar y cómo

Con una prueba gratuita se puede cerrar lo que quedó sin confirmar:

| Prueba | Qué cierra | Costo |
|---|---|---|
| Sportmonks, 14 días | Que los campos vengan llenos por jugador; si hay duelos ganados y totales; transferencias | Pide tarjeta; cobra si no se cancela |
| TheStatsAPI, 7 días | Cobertura de ligas menores; contrato y valor de mercado en el plantel; campos exactos | Gratis (pide cuenta) |

Protocolo propuesto: tomar 10 jugadores nuestros de cada liga (con minutos altos) y comprobar en cada API qué campos devuelve y qué porcentaje encuentra, cruzando por nombre y fecha de nacimiento. Las claves van en `backend/.env`, nunca en el repo.

## 11. Fuentes consultadas (14/11/2026)

- API-Football: documentación y precios (la página de precios bloquea la lectura automática); pruebas con la clave del proyecto.
- Sportmonks: página de precios, términos de uso, documentación v3 y Coverage Finder.
- TheStatsAPI: documentación, tabla de cobertura, términos.
- FootyStats: página de la API (planes y campos).
- Goalserve, BeSoccer, OpenFoot, TheSportsDB, BDFA, Wikidata: páginas oficiales leídas; ver las limitaciones de cada una más arriba.
- Listado public-apis (github.com/public-apis/public-apis), sección Sports & Fitness, como punto de partida.
