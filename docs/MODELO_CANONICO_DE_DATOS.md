# MODELO_CANONICO_DE_DATOS.md

Es la fuente de verdad de las entidades del sistema. Las migraciones de Alembic se generan a partir de este documento. Si una migración necesita algo que no está acá, primero se propone el cambio en este archivo.

- **Motor:** MySQL 8, `utf8mb4`.
- **Claves primarias:** `BIGINT UNSIGNED AUTO_INCREMENT`, salvo `seguimiento`, que usa una PK compuesta.
- **Fechas:** `DATETIME` en UTC. Las columnas de auditoría se llaman `creado_en` y `actualizado_en`.

## Diagrama

```
usuario 1──1 perfil_busqueda N──1 liga
usuario 1──N seguimiento N──1 jugador
jugador 1──N estadistica_temporada N──1 liga
                                    N──1 equipo
sincronizacion N──1 liga (opcional)
```

---

### Entidad: Usuario

Persona con cuenta. El club es texto libre: la gestión de clubes es R3.

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| id | BIGINT | no | auto | PK |
| nombre | VARCHAR(120) | no | — | Nombre y apellido |
| email | VARCHAR(254) | no | — | Se guarda en minúsculas y sin espacios. Único |
| hash_contrasena | VARCHAR(255) | no | — | Argon2 (ADR-0005). Nunca se guarda la contraseña en texto plano |
| rol | ENUM(Rol) | no | — | `director_tecnico`, `director_deportivo`, `dirigente`, `ojeador` |
| club | VARCHAR(120) | no | — | Club del usuario (texto libre) |
| terminos_aceptados_en | DATETIME | no | — | Momento en que aceptó los términos |
| creado_en | DATETIME | no | now | |

- **Invariante:** `email` es único sin distinguir mayúsculas.
- **Índices:** único en `email`.

### Entidad: Liga

Competición cubierta por el MVP. Se carga por seed (ver `INTEGRACIONES_EXTERNAS.md`).

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| id | BIGINT | no | auto | PK |
| id_api_football | INT | no | — | Único |
| nombre | VARCHAR(80) | no | — | Nombre que ve el usuario, por ejemplo "Primera B Metropolitana" |
| temporada_actual | SMALLINT | no | — | Temporada que se sincroniza y se muestra |
| cobertura | ENUM(`completa`,`basica`,`sin_datos`) | no | `sin_datos` | Se recalcula al final de cada sincronización (RN-020) |
| orden | SMALLINT | no | 0 | Orden en el selector de ligas |

Ligas del MVP: Liga Profesional, Primera Nacional, Primera B Metropolitana, Primera C, Primera D y Torneo Federal A.

### Entidad: Equipo

Club real en el que juega el jugador, según API-Football.

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| id | BIGINT | no | auto | PK |
| id_api_football | INT | no | — | Único |
| nombre | VARCHAR(120) | no | — | |

### Entidad: Jugador

Datos personales del jugador. Las estadísticas van aparte, en `EstadisticaTemporada`.

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| id | BIGINT | no | auto | PK |
| id_api_football | INT | no | — | Único |
| nombre | VARCHAR(120) | no | — | Nombre para mostrar (`player.name`) |
| nombre_pila | VARCHAR(80) | sí | — | `player.firstname` |
| apellido | VARCHAR(80) | sí | — | `player.lastname` |
| fecha_nacimiento | DATE | sí | — | `player.birth.date`. Con esto se calcula la edad (RN-009) |
| nacionalidad | VARCHAR(60) | sí | — | |
| valor_mercado_eur | INT UNSIGNED | sí | — | Viene de transfermarkt-datasets. `NULL` = costo no disponible (RN-002) |
| id_transfermarkt | INT | sí | — | Jugador de Transfermarkt con el que se cruzó. Único cuando no es nulo |
| valor_mercado_fecha | DATE | sí | — | Fecha del valor según el dataset |
| actualizado_en | DATETIME | no | now | |

- **Invariante:** `valor_mercado_eur` ≥ 0 si no es nulo.
- **Índices:**
  - único en `id_api_football`;
  - único en `id_transfermarkt`;
  - índice en `valor_mercado_eur` (filtro de presupuesto);
  - índice en `fecha_nacimiento` (filtro de edad).

### Entidad: EstadisticaTemporada

Números de un jugador en una liga, un equipo y una temporada. Una fila por cada entrada de `statistics[]` de API-Football. `NULL` significa "dato no disponible", nunca 0.

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| id | BIGINT | no | auto | PK |
| jugador_id | BIGINT | no | — | FK → jugador |
| liga_id | BIGINT | no | — | FK → liga |
| equipo_id | BIGINT | no | — | FK → equipo |
| temporada | SMALLINT | no | — | |
| posicion | ENUM(Posicion) | sí | — | `games.position` mapeado (RN-019) |
| partidos_jugados | SMALLINT | sí | — | `games.appearences` (así, con esa ortografía, viene de la API) |
| minutos_jugados | INT | sí | — | `games.minutes` |
| goles | SMALLINT | sí | — | `goals.total` |
| asistencias | SMALLINT | sí | — | `goals.assists` |
| pases_precision_pct | DECIMAL(5,2) | sí | — | `passes.accuracy`. Hay que confirmar si la API lo da como % o como cantidad (ver `INTEGRACIONES_EXTERNAS.md`) |
| duelos_totales | SMALLINT | sí | — | `duels.total` |
| duelos_ganados | SMALLINT | sí | — | `duels.won` |
| rating | DECIMAL(4,2) | sí | — | `games.rating` |
| intercepciones | SMALLINT | sí | — | `tackles.interceptions` |
| sincronizado_en | DATETIME | no | now | |

**No se guardan, se calculan** (RN-018): `duelos_ganados_pct`, `recuperaciones_por_partido` y `edad`.

- **Invariantes:**
  - todos los contadores son ≥ 0 si no son nulos;
  - `duelos_ganados` ≤ `duelos_totales`;
  - `pases_precision_pct` está entre 0 y 100.
- **Índices:**
  - único en (`jugador_id`, `liga_id`, `equipo_id`, `temporada`);
  - índice en (`temporada`, `posicion`, `liga_id`), que es el patrón de búsqueda principal;
  - índice en `jugador_id`.

### Entidad: PerfilBusqueda

Filtros guardados. Hay uno por usuario en el MVP; tener varios es R2 (RN-023).

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| id | BIGINT | no | auto | PK |
| usuario_id | BIGINT | no | — | FK → usuario. Único |
| posicion | ENUM(Posicion) | no | — | Obligatorio |
| liga_id | BIGINT | no | — | FK → liga. Obligatorio |
| edad_min | TINYINT | no | — | Obligatorio, entre 15 y 45 |
| edad_max | TINYINT | no | — | Obligatorio, entre 15 y 45, y ≥ `edad_min` |
| presupuesto_max_eur | INT UNSIGNED | sí | — | Nulo = sin filtro de presupuesto |
| pases_min | DECIMAL(5,2) | sí | — | Nulo = sin filtro |
| duelos_min | DECIMAL(5,2) | sí | — | Nulo = sin filtro |
| recuperaciones_min | DECIMAL(4,2) | sí | — | Nulo = sin filtro |
| minutos_min | INT | sí | — | Nulo = sin filtro |
| actualizado_en | DATETIME | no | now | |

- **Invariante:** `edad_min` ≤ `edad_max`.

### Entidad: Seguimiento

Jugador guardado en la lista de seguimiento de un usuario.

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| usuario_id | BIGINT | no | — | PK compuesta, FK → usuario |
| jugador_id | BIGINT | no | — | PK compuesta, FK → jugador |
| creado_en | DATETIME | no | now | La lista se ordena por este campo, del más reciente al más viejo |

- **Invariante:** un jugador aparece una sola vez por usuario. Agregarlo de nuevo no hace nada (es idempotente).

### Entidad: Sincronizacion

Registro de cada corrida del proceso de sincronización, para auditar y diagnosticar errores.

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| id | BIGINT | no | auto | PK |
| origen | ENUM(`api_football`,`transfermarkt`) | no | — | |
| liga_id | BIGINT | sí | — | FK → liga. Nulo para Transfermarkt |
| temporada | SMALLINT | sí | — | |
| iniciada_en | DATETIME | no | now | |
| finalizada_en | DATETIME | sí | — | |
| estado | ENUM(`en_curso`,`ok`,`error`) | no | `en_curso` | |
| pedidos_usados | INT | no | 0 | Pedidos hechos a API-Football (cupo de 7.500 por día) |
| registros_actualizados | INT | no | 0 | |
| mensaje_error | TEXT | sí | — | |

---

## Enums

- **Posicion:** `arquero`, `defensor`, `mediocampista`, `delantero`.
- **Rol:** `director_tecnico`, `director_deportivo`, `dirigente`, `ojeador`.
- **Cobertura:** `completa`, `basica`, `sin_datos`.

## Qué no se persiste en el MVP

- Comparaciones: el historial es R3.
- Historial de búsquedas: R3.
- Score: R2.
- Presupuesto del club: R3.
- Sueldos.
