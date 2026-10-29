# INTEGRACIONES_EXTERNAS.md

## 1. API-Football v3

| Dato | Valor |
|---|---|
| Proveedor | API-Football (api-sports.io) |
| Plan | Pro: 7.500 pedidos por día, USD 19 por mes, desde la fase de Ejecución |
| URL base | `https://v3.football.api-sports.io` |
| Autenticación | Header `x-apisports-key: ${API_FOOTBALL_KEY}`. La clave vive **solo** en la variable de entorno, nunca en el repo |
| Uso | Solo desde el CLI de sincronización (ADR-0008). Las pantallas nunca llaman a la API |
| Frecuencia | Una vez por día con GitHub Actions (`.github/workflows/sincronizacion.yml`, ADR-0009) **(supuesto)**, más corridas manuales desde la pestaña Actions |

### Endpoints que se consumen

| Endpoint | Para qué |
|---|---|
| `GET /leagues?country=Argentina` | Confirmar los IDs de liga y la temporada actual (una vez, para el seed) |
| `GET /leagues?id={id}` | Temporadas de cada liga, al inicio de la sincronización, para elegir la de RN-027 |
| `GET /players?league={id}&season={temporada}&page={n}` | Jugadores con estadísticas, 20 por página, paginado con `paging.total` |

**Presupuesto de pedidos:** unos 50 pedidos por liga (hasta 1.000 jugadores) × 6 ligas ≈ 300 por corrida, bien por debajo del cupo. El cliente lee los headers `x-ratelimit-requests-remaining` y frena si quedan menos de 100.

### IDs de liga y cobertura real (reconocimiento del 28/10/2026)

Medido con el plan Pro, con 23 pedidos. Las respuestas están grabadas en `backend/tests/fixtures/api_football/`.

| Liga | `id_api_football` | Temporada "actual" de la API | Qué trae `/players` en esa temporada | Última temporada con datos |
|---|---|---|---|---|
| Liga Profesional Argentina | **128** ✅ | 2026 | **Completa:** 60 páginas (unos 1.200 jugadores) con minutos, pases %, duelos, intercepciones y rating | 2026 |
| Primera Nacional | **129** ✅ | 2026 | Casi vacía: 4 jugadores, sin minutos ni métricas | 2025: 84 páginas, **solo minutos** (en unos 3 de cada 4 jugadores) y posición |
| Primera B Metropolitana | **131** ✅ | 2026 | Casi vacía: 1 jugador, sin métricas | 2025: 52 páginas, solo minutos y posición |
| Primera C | **132** ✅ | 2026 | Vacía (0 jugadores; la API marca `coverage.players = false`) | 2025: 33 páginas, solo posición, **sin minutos** |
| Primera D | **133** ✅ | **2023** (la API no tiene temporadas más nuevas) | 8 páginas, solo posición, sin minutos | 2023 |
| Torneo Federal A | **134** ✅ | 2026 | Casi vacía: 4 jugadores, sin métricas | 2025: 82 páginas, solo minutos y posición |

**Conclusiones:**
- **Solo la Liga Profesional tiene métricas de rendimiento.** En el ascenso, la API trae a lo sumo minutos, posición y edad, y en la temporada 2026 casi no hay jugadores cargados. El Spike suponía que Primera Nacional y B Metropolitana tenían cobertura completa: no es así.
- Los flags `coverage.players` de `/leagues` no son confiables: dicen `true` para Primera Nacional 2026, que tiene 4 jugadores.
- Las temporadas de `statistics[]` en `/players` traen otras ligas del mismo jugador. En la página de la Liga Profesional solo vino la 128, pero el filtro por liga tiene que estar igual.
- El mismo jugador puede aparecer dos veces en la misma liga y temporada, con equipos distintos (por ejemplo, "M. Rojo" en la página 1 de la 128). Es el caso de RN-017.

**Decisiones del PO:** qué temporada usar en el ascenso quedó decidido el 29/10 (RN-027: 2025 hasta que 2026 tenga 100 jugadores con minutos). Falta cómo mostrar Primera C y D (RN-028, **propuesta**).

### Mapeo de campos

La respuesta de `/players` trae `response[].player` y `response[].statistics[]`.

| API-Football | Modelo canónico | Nota |
|---|---|---|
| `player.id` | `jugador.id_api_football` | |
| `player.name` / `firstname` / `lastname` | `jugador.nombre` / `nombre_pila` / `apellido` | |
| `player.birth.date` | `jugador.fecha_nacimiento` | |
| `player.nationality` | `jugador.nacionalidad` | |
| `statistics[].team.id` / `team.name` | `equipo.id_api_football` / `equipo.nombre` | |
| `statistics[].league.id` | `liga` (por `id_api_football`) | Las entradas de otras ligas (copas, etc.) **se ignoran** |
| `statistics[].games.position` | `estadistica_temporada.posicion` | Mapeo según RN-019. En 2026 apareció `Forward` además de `Attacker` (ver RN-019) |
| `games.appearences` | `partidos_jugados` | La API lo escribe así, con esa ortografía |
| `games.minutes` | `minutos_jugados` | |
| `games.rating` | `rating` | Viene como string, por ejemplo `"7.123456"`. Se convierte a decimal |
| `goals.total` / `goals.assists` | `goles` / `asistencias` | |
| `passes.accuracy` | `pases_precision_pct` | ✅ **Confirmado el 28/10: es un porcentaje** (entero de 0 a 100; por ejemplo 74 con `passes.total` = 664). Se guarda tal cual |
| `duels.total` / `duels.won` | `duelos_totales` / `duelos_ganados` | |
| `tackles.interceptions` | `intercepciones` | |

### Cómo lo implementa la sincronización (DAT-001)

| Pieza | Archivo |
|---|---|
| Cliente HTTP (header, paginado, reintentos, cupo) | `app/integraciones/cliente_api_football.py` |
| Mapeo de `/players` al modelo canónico | `app/sincronizacion/mapeo.py` |
| Upserts (`INSERT ... ON CONFLICT`) y conteo para la cobertura | `app/repositorios/sincronizacion_api_football.py` |
| Cobertura (RN-020) | `app/servicios/cobertura.py` |
| CLI y transacción por liga | `app/sincronizacion/api_football.py` |

Decisiones de implementación (28/10, validadas por Marin):

- **`Forward` → `delantero`**, como propone RN-019. Si el PO decide otra cosa, se cambia en `POSICIONES_API`.
- **Un dato que viola las invariantes del modelo queda `NULL`** en lugar de hacer fallar la liga entera: `passes.accuracy` fuera de 0-100, `duels.won` mayor que `duels.total` (quedan los dos en `NULL`) y contadores negativos.
- **Al terminar bien, `liga.temporada_actual` pasa a ser la temporada sincronizada**, también con `--temporada`. Por defecto la elige RN-027: se piden `/leagues?id=X` (un pedido) y las páginas de cada temporada que se prueba, como máximo 3. La búsqueda y el comparador leen la temporada de `liga.temporada_actual`.
- **Si la API repite el mismo equipo para un jugador en la liga**, queda la entrada con más minutos: la clave única es jugador + liga + equipo + temporada.
- **El valor de mercado no se toca:** el upsert del jugador actualiza solo los campos que trae API-Football.
- Cada intento HTTP, incluidos los reintentos, cuenta en `sincronizacion.pedidos_usados`.

### Ante fallos (RN-025)

| Situación | Qué hace el sistema |
|---|---|
| Timeout de 10 segundos o error 5xx | Hasta 3 reintentos con backoff de 1, 2 y 4 segundos. Si sigue fallando, rollback de la liga y `sincronizacion.estado = error` |
| Campo `errors` no vacío en la respuesta (por ejemplo, cupo agotado o clave inválida) | Se trata como error. No se escribe nada de esa liga |
| Cualquier error | Nunca se pisan datos existentes con vacíos. El error se loguea con el ID de liga y la página, sin la clave |

### Fixtures para tests

`backend/tests/fixtures/api_football/`: respuestas reales grabadas una vez. Como mínimo:

- una página de una liga `completa`;
- una página de una liga `basica` (sin pases ni duelos);
- una respuesta con `errors` no vacío.

## 2. transfermarkt-datasets

| Dato | Valor |
|---|---|
| Fuente | https://github.com/dcaribou/transfermarkt-datasets |
| Licencia | CC0-1.0 |
| Estado | Actualizaciones pausadas. El dataset está al **6/7/2026** |
| Archivo | `players.csv`. Columnas que se usan: `player_id`, `name`, `first_name`, `last_name`, `date_of_birth`, `market_value_in_eur`, `current_club_domestic_competition_id` |
| Uso | CLI `python -m app.sincronizacion.transfermarkt --archivo <ruta a players.csv>`, una vez y cuando haya un dataset nuevo |
| Moneda | EUR (RN-004) |

**Cruce con los jugadores de API-Football:** RN-002. Al terminar se informa el resumen: X cruzados, Y sin coincidencia, Z ambiguos. Se guarda en `sincronizacion.registros_actualizados` y en el log.

**Descarga:** `https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz` (unos 4,4 MB, 50.149 jugadores). El CLI lee el `.csv.gz` tal cual. No se sube al repo.

**Formato real (verificado el 28/10):**

- `date_of_birth` viene como `AAAA-MM-DD 00:00:00`;
- `market_value_in_eur` puede venir vacío: el jugador se cruza (se guarda `id_transfermarkt`), pero queda sin valor;
- **no hay columna con la fecha de cada valor.** `valor_mercado_fecha` es la fecha de corte del dataset, el 2026-07-06 (`FECHA_DATASET` en `app/sincronizacion/transfermarkt.py`; se puede cambiar con `--fecha`).

**Cobertura medida (28/10).** Con el CSV completo y los 40 jugadores reales de los fixtures de API-Football:

| Liga | Jugadores | Con valor | Cruzados sin valor | Sin coincidencia |
|---|---|---|---|---|
| Liga Profesional (128, 2026, página 1) | 20 | **20** | 0 | 0 |
| Primera Nacional (129, 2025, página 1) | 20 | **4** | 1 | 15 |

- El dataset solo tiene una competencia argentina: `ARG1` (Liga Profesional), con 1.261 jugadores. **No tiene ninguna liga del ascenso.**
- En la Liga Profesional todos los jugadores de la muestra están en el dataset, pero 16 de 20 cruzan recién con el paso 2b de RN-002 **(propuesta)**: API-Football trae el nombre completo y Transfermarkt el "de uso".
- En el ascenso solo cruzan los que jugaron antes en una liga del dataset. ⚠️ **Hay que avisarle al PO antes del Demo Day:** con el filtro de presupuesto activo, casi todo el ascenso queda excluido.
- La medición completa por liga se hace con la primera importación contra la base de producción: el CLI imprime el resumen por liga.

**Cómo correrla:**

```bash
cd backend
python -m app.sincronizacion.transfermarkt --archivo ~/Descargas/players.csv.gz
```

Tiene que correr **después** de la sincronización de API-Football, porque cruza los jugadores que ya están en la base. Volver a correrla no duplica nada: recalcula el valor de todos los jugadores.

**Fixture:** `backend/tests/fixtures/transfermarkt/players_muestra.csv`, con filas reales del dataset (coincidencia exacta, por palabras, valor vacío y un caso ambiguo armado a mano). Ver su `README.md`.

## 3. Integraciones descartadas

| Integración | Motivo |
|---|---|
| Sportmonks | No tiene valor de mercado y no hace falta, porque el alcance es API-Football |
| Scrapers de Transfermarkt (Apify, etc.) | Violan los términos de uso de Transfermarkt |
| APIs pagas de "market value" (Zyla, etc.) | No dicen de dónde sacan los datos, no aclaran la cobertura y cuestan desde USD 10.000 por año |
