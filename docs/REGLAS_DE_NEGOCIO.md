# REGLAS_DE_NEGOCIO.md

Fuente única de las reglas de cálculo y de decisión. Las specs las citan por ID y no las repiten.

- Las RN-001 a RN-014 cierran el documento "Reglas de negocio abiertas" (decidido el 2026-10-27).
- Las RN-015 en adelante salen del prototipo v1, de las historias de Trello y de las decisiones de stack.
- Lo marcado **(supuesto)** no lo confirmó el equipo: se implementa así hasta que el PO diga otra cosa.

## Principio de alcance de datos

- **El alcance de datos del MVP es el de API-Football.** Lo que la API no trae no entra.
- **Única excepción:** el valor de mercado, que sale de transfermarkt-datasets (CC0, congelado al 6/7/2026, en EUR). Ver ADR-0004.
- **Fuera del MVP:**
  - carga de datos propios del club;
  - trial de Sportmonks;
  - distancia recorrida y centros (no existen en la API);
  - las 10 posiciones detalladas del prototipo (la API trae 4, ver RN-019).
- Los datos de demostración del prototipo **no** se usan en el MVP: la demo usa datos reales.

**Ligas del MVP:** Liga Profesional, Primera Nacional, Primera B Metropolitana, Primera C, Primera D y Torneo Federal A.

**Temporada:** cada liga usa la temporada que elige RN-027 (decidida el 29/10). Se guarda en `liga.temporada_actual`, y la ficha y el comparador la muestran.

---

## Prioridad 1 — Demo Day (9/11)

### RN-001 Métricas oficiales del MVP

**Métricas de identificación** (todas las ligas): posición, edad, liga y equipo.

**Métricas de rendimiento.** Se muestran donde la API las trae; donde no, "Dato no disponible" (RN-008):

| Métrica | Nombre en código | Origen | ¿Filtro mínimo? | Ficha | Comparador |
|---|---|---|---|---|---|
| Minutos jugados | `minutos_jugados` | `games.minutes` | **Sí** | Sí | Sí |
| Partidos jugados | `partidos_jugados` | `games.appearences` | No | Sí | Sí |
| Goles | `goles` | `goals.total` | No | Sí | Sí |
| Asistencias | `asistencias` | `goals.assists` | No | Sí | Sí |
| % pases completados | `pases_precision_pct` | `passes.accuracy` | **Sí** | Sí | Sí |
| % duelos ganados | `duelos_ganados_pct` | RN-018 | **Sí** | Sí | Sí |
| Recuperaciones por partido | `recuperaciones_por_partido` | RN-018 (intercepciones) | **Sí** | Sí | Sí |
| Rating | `rating` | `games.rating` | No | Sí | Sí |
| Valor de mercado | `valor_mercado_eur` | RN-002 | Presupuesto (RN-005) | Sí | Aparte (RN-006) |

- **Filtros tácticos** (decidido): % pases, % duelos, recuperaciones por partido y minutos jugados. Así se unifican la historia de Trello y el prototipo.
- **Se sacan:** distancia recorrida y centros.
- **Spike:** en Primera C, Primera D y Federal A la API trae solo minutos, posición y edad.
- **Reconocimiento del 28/10:** es peor que el Spike. Solo la Liga Profesional trae pases, duelos, recuperaciones y rating. El resto del ascenso trae a lo sumo minutos y posición, y en 2026 casi no tiene jugadores cargados (ver `INTEGRACIONES_EXTERNAS.md` y RN-027).

Usada en: BUS-003, JUG-001, CMP-001.

### RN-002 Origen y cruce del valor de mercado

- El valor de mercado sale de `players.csv` de transfermarkt-datasets (`market_value_in_eur`).
- En la UI se muestra como **"Valor de mercado (Transfermarkt, jul 2026)"**.

**Cruce con un jugador de API-Football:**

1. Se normaliza el nombre: minúsculas, sin tildes, sin signos y con espacios simples.
2. Se busca en el CSV una fila con `date_of_birth` igual a `jugador.fecha_nacimiento` **y** con el nombre normalizado igual a `normalizar(nombre_pila + " " + apellido)` o a `normalizar(nombre)`.
3. Si hay **exactamente una** coincidencia, se guardan `valor_mercado_eur`, `id_transfermarkt` y `valor_mercado_fecha`. Si hay 0 o más de 1, el jugador queda sin valor **(supuesto)**.
4. Si el jugador no tiene `fecha_nacimiento`, no se cruza.

**Ejemplo:** API-Football trae "Nahuel Ferreyra", nacido el 2003-04-12. En el CSV hay una sola fila "Nahuel Ferreyra" con esa fecha y valor 85000. Resultado: `valor_mercado_eur = 85000`.

**Paso 2b: cruce por palabras (decisión del equipo, Cilento, 26/11/2026; propuesta del 28/10).** Si el paso 2 no encuentra ninguna fila:

- se buscan las filas con `date_of_birth` igual a `jugador.fecha_nacimiento`;
- cuyo nombre normalizado tenga **al menos 2 palabras**;
- y **todas** sus palabras estén en `normalizar(nombre_pila + " " + apellido)`.

Se aplica el paso 3 igual: solo vale si queda exactamente una fila. Si dos jugadores cruzan con la misma fila, los dos quedan sin valor, porque `id_transfermarkt` es único.

**Por qué:** API-Football trae todos los nombres y los dos apellidos, y Transfermarkt el nombre "de uso". Con el paso 2 solo, en la página 1 de la Liga Profesional cruzan 4 de 20 jugadores.

**Ejemplo:** API-Football trae "Néstor Fernando" + "Muslera Micol", nacido el 1986-06-16. En el CSV hay una sola fila con esa fecha y nombre "Fernando Muslera", valor 700000. {fernando, muslera} ⊆ {nestor, fernando, muslera, micol} → `valor_mercado_eur = 700000`. "Perez" sola (una palabra) no alcanza para cruzar.

**Pendiente de validar con el PO.** Implementado en DAT-002 (`servicios/valor_mercado.py`).

**Cobertura medida (28/10)** con los jugadores reales de los fixtures de API-Football y el `players.csv` completo (detalle en `INTEGRACIONES_EXTERNAS.md`):

| Muestra | Solo paso 2 | Con el paso 2b |
|---|---|---|
| Liga Profesional, 20 jugadores | 4 con valor (20%) | 20 con valor (100%) |
| Primera Nacional, 20 jugadores | 2 con valor (10%) | 4 con valor (20%) |

**Riesgo para la demo:** el dataset solo tiene clubes de la Liga Profesional (`ARG1`). En el ascenso solo hay valor para quienes jugaron antes en otra liga del dataset, así que con el filtro de presupuesto activo casi todo el ascenso queda excluido (RN-005).

Usada en: DAT-002, BUS-004, JUG-001, CMP-001.

### RN-003 Qué es el presupuesto

- Es un **monto máximo por búsqueda** (`presupuesto_max_eur`), que se compara contra el valor de mercado.
- El sueldo queda fuera del MVP.
- El presupuesto del club guardado es R3.
- **Monto:** cualquier monto entero mayor que 0, sin tope (decisión del equipo, Cilento, 26/11/2026). Antes era un slider de €20.000 a €400.000, el rango del prototipo pasado a EUR, que dejaba afuera a casi toda la Liga Profesional (un titular vale millones). Queda un **límite técnico** de €1.000.000.000, porque el perfil guarda el monto en un `Integer`; no es una regla de negocio.
  - **Ejemplo:** €5.000.000 en la Liga Profesional deja a los jugadores que valen hasta €5.000.000, incluido €5.000.000 (RN-005). €0 o un monto negativo devuelve 422.
- **El filtro es opcional y arranca apagado (supuesto).** Si el usuario no lo activa, no se excluye a nadie por falta de valor. Si arrancara prendido, en el ascenso, donde casi nadie tendría valor, la búsqueda inicial quedaría vacía.

Usada en: BUS-004, BUS-005.

### RN-004 Moneda

- Se muestra en **EUR**, tal como viene del dataset, sin convertir.
- Formato: `€ 85.000`, y en forma corta `€85K`.
- Pesos argentinos es R2.

Usada en: BUS-004, JUG-001, CMP-001.

### RN-005 Cuándo un jugador entra en el presupuesto

```
si presupuesto_max_eur es None:      no se filtra por presupuesto
si valor_mercado_eur es None:        excluido (cuenta en excluidos_sin_valor)
si valor_mercado_eur <= presupuesto: entra
si no:                               no entra
```

Un jugador sin valor se muestra en la ficha como "Costo no disponible". Cuando el filtro está activo, un aviso indica cuántos quedaron afuera por no tener valor.

**Ejemplo:** con un presupuesto de €150.000, un jugador de €150.000 entra, uno de €150.001 no entra y uno sin valor queda excluido y cuenta en el aviso.

Usada en: BUS-004, JUG-001 (coincidencia).

### RN-006 Mejor y Peor en el comparador

Para cada métrica de rendimiento de RN-001 (todas son "mayor es mejor"):

```
valores = [v de cada jugador si v no es None]
si len(valores) < 2:            nadie se marca en esa fila
mejor = todos los jugadores con v == max(valores)
peor  = todos los jugadores con v == min(valores), salvo que max == min (empate total: solo "Mejor")
un jugador sin el dato no compite en esa fila
metricas_ganadas[jugador] = cantidad de filas en las que es "Mejor"
```

- El **valor de mercado no compite.** Se muestra aparte:
  - `diferencia_valor_eur` = máximo − mínimo entre los jugadores que tienen valor;
  - el más barato entre ellos.
- Si menos de 2 jugadores tienen valor, se muestra "Costo no disponible" para la diferencia **(supuesto)**.

**Ejemplo:**

- Pases: A 87, B 83, C 87 → A y C son "Mejor", B es "Peor".
- Duelos: A 61, B null, C 58 → A es "Mejor", C es "Peor", B no compite.

Usada en: CMP-001.

### RN-007 Cantidad de jugadores a comparar

Mínimo 2 y máximo 3, sin repetidos.

- Con menos de 2, el botón "Comparar" está deshabilitado.
- Si se intenta agregar un cuarto, no se agrega y aparece el aviso "Se pueden comparar hasta 3 jugadores a la vez".
- La API devuelve 400 si recibe menos de 2, más de 3 o IDs repetidos.

Usada en: CMP-001, BUS-006 (barra de selección), SEG-001.

### RN-008 Dato faltante

- Se muestra **"Dato no disponible"**, nunca un 0.
- En la UI va el tooltip "La liga de este jugador no publica esta métrica".
- Si se filtra por una métrica y el jugador no la tiene, queda **excluido**.
- La respuesta informa `excluidos_por_dato_faltante`: cuántos cumplían todo lo demás pero quedaron afuera solo por no tener alguna métrica filtrada. En la UI se muestra: "N jugadores cumplen el perfil pero quedaron afuera: su liga no publica alguna de las métricas por las que estás filtrando".

Usada en: BUS-003, JUG-001, CMP-001.

### RN-009 Edad

```
edad = años cumplidos entre fecha_nacimiento y la fecha de hoy
```

- Si no hay `fecha_nacimiento`, la edad es "Dato no disponible", y con un filtro de edad activo el jugador queda excluido.
- Los rangos incluyen los extremos: 20 a 27 incluye a 20 y a 27.

**Ejemplo:** hoy es 2026-10-27. Alguien nacido el 2003-10-28 tiene 22 años; alguien nacido el 2003-10-27 tiene 23.

Usada en: BUS-001, JUG-001.

---

## Prioridad 2 — MVP v2 (16/11) o R2

### RN-010 Score

- **Fuera del MVP v1** (pasa a R2). Hay que sacarlo de todas las pantallas del prototipo.
- La lista se ordena según RN-021.

### RN-011 Cálculo del Score

- No aplica en v1.
- En R2: promedio ponderado normalizado por posición, de 0 a 100. Si faltan métricas, el peso se reparte entre las disponibles y el Score se marca "parcial". Hay que recalcular los pesos con las métricas de RN-001.

### RN-012 Coincidencia con el perfil (ficha)

Se arma una lista de criterios a partir del perfil guardado o, si no hay, de los filtros actuales. Cada criterio puede ser `cumple`, `no_cumple` o `no_disponible`:

- **Posición:** cumple si coincide. Si no se filtró por posición, el criterio cumple con el texto "Cualquier posición".
- **Edad:** está dentro del rango. Si falta la fecha de nacimiento, es `no_disponible`.
- **Presupuesto:** solo si hay `presupuesto_max_eur`. Si el jugador no tiene valor, es `no_disponible`.
- **Mínimo táctico:** uno por cada uno cargado. Si la liga no publica la métrica, es `no_disponible`.

Se muestra "Cumple X de N criterios". **No es un porcentaje.**

**Ejemplo:** perfil Defensor, 20-27 años, €150.000, pases ≥ 80. El jugador es defensor, tiene 24 años, vale €120.000 y su liga no publica pases. Resultado: cumple, cumple, cumple y no_disponible → "Cumple 3 de 4".

Usada en: JUG-001.

### RN-013 Jugadores similares (R2)

Misma posición y una diferencia menor a un margen en cada métrica oficial, ordenados de menor a mayor valor. El margen se define con Backend y hay que validarlo con usuarios.

### RN-014 Reporte PDF (R2)

Incluye los jugadores comparados, sus métricas, el valor de mercado y la fecha de los datos (temporada de API-Football y corte de Transfermarkt). Hay que validarlo con usuarios.

---

## Reglas que salen del prototipo, Trello y el stack

### RN-015 Promedio de la posición (ficha)

- Es el promedio de la métrica entre los jugadores de la **misma posición** en la temporada actual de **todas las ligas del MVP**, ignorando nulos.
- Si nadie tiene el dato, se muestra "—".
- En la ficha aparece como una marca sobre la barra.

**Ejemplo:** hay tres defensores con pases de 86, null y 84 → el promedio es 85,0.

Usada en: JUG-001.

### RN-016 Sugerencia cuando no hay resultados

Si la búsqueda devuelve 0 resultados, se prueba quitar de a uno cada filtro activo, en este orden:

1. posición;
2. liga;
3. presupuesto;
4. pases;
5. duelos;
6. recuperaciones;
7. minutos.

Se sugiere el filtro cuya eliminación da **más** resultados. Si hay empate, gana el primero del orden. Si ninguno da resultados, no se sugiere nada.

En la UI se muestra: "Si relajás **el presupuesto** aparecen 7 candidatos", con un botón "Relajar".

Usada en: BUS-006.

### RN-017 Una fila por jugador en los resultados (supuesto)

- Si un jugador tiene más de una `estadistica_temporada` en la misma temporada (por ejemplo, porque cambió de equipo), en búsqueda, ficha y comparador se usa la fila con **más minutos jugados**.
- Si hay empate, se usa la de mayor `id`.
- El equipo que se muestra es el de esa fila.

Usada en: BUS-*, JUG-001, CMP-001.

### RN-018 Métricas derivadas

Si falta algún operando, el resultado es `None`.

```
duelos_ganados_pct         = duelos_ganados / duelos_totales * 100   (None si duelos_totales es None o 0)
recuperaciones_por_partido = intercepciones / partidos_jugados        (None si partidos_jugados es None o 0)
```

Se redondean para mostrar: 0 decimales los porcentajes, 1 decimal las recuperaciones y 2 decimales el rating.

**Ejemplo:** 61 duelos ganados de 100 → 61%. 52 intercepciones en 28 partidos → 1,9 por partido.

Usada en: BUS-003, JUG-001, CMP-001.

### RN-019 Posiciones

| API-Football (`games.position`) | Código | UI |
|---|---|---|
| Goalkeeper | `arquero` | Arquero |
| Defender | `defensor` | Defensor |
| Midfielder | `mediocampista` | Mediocampista |
| Attacker | `delantero` | Delantero |
| Forward (decisión del equipo, Cilento, 26/11/2026) | `delantero` | Delantero |
| otro o vacío | `None` | Dato no disponible |

Las 10 posiciones del prototipo se reemplazan por estas 4 (decidido).

Usada en: DAT-001, BUS-001.

### RN-020 Cobertura de liga (supuesto)

Se recalcula al final de cada sincronización de la liga:

```
n = jugadores con minutos_jugados > 0 en la temporada actual
si n == 0:                                     sin_datos
si < 50% de esos n tiene pases_precision_pct:  basica
si no:                                         completa
```

En la UI:

- `basica` → chip "Datos básicos" y la etiqueta "(datos básicos)" en el selector;
- `sin_datos` → "Todavía no tenemos datos de <liga>", con un botón "Ver todas las ligas".

Usada en: DAT-001, BUS-002.

### RN-021 Orden y paginado

| Opción | Código | Dirección | Nulos |
|---|---|---|---|
| Minutos jugados **(por defecto, supuesto)** | `minutos` | descendente | al final |
| Valor (menor primero) | `valor` | ascendente | al final |
| Edad (menor primero) | `edad` | ascendente | al final |
| % pases completados | `pases` | descendente | al final |
| Rating (solo con una liga elegida, RN-029) | `rating` | descendente | al final |

- Si hay empate, se ordena por `jugador.nombre` ascendente.
- Las páginas son de **6** resultados, como en el prototipo.

Usada en: BUS-006.

### RN-022 Registro e ingreso

**Registro.** Todos los campos son obligatorios:

| Campo | Regla |
|---|---|
| Nombre | No vacío, se recorta |
| Email | Formato válido (`^[^\s@]+@[^\s@]+\.[^\s@]+$`), se guarda en minúsculas y es único |
| Rol | Uno de los 4 de `Rol` |
| Club | No vacío |
| Contraseña | **Mínimo 8 caracteres** |
| Términos | Aceptados |

**Mensajes del registro** (los del prototipo):

- "Ese correo ya tiene una cuenta. Probá ingresando." (409)
- "Le faltan N caracteres: el mínimo es 8."
- "Completá tu nombre y apellido.", etc.

**Ingreso.** Si el email no existe o la contraseña es incorrecta, el mensaje es **siempre** "Correo o contraseña incorrectos." (401). Nunca se dice cuál de los dos falló.

**Al registrarse o ingresar:** se crea la cookie de sesión y se redirige a `/buscar`. Las pantallas privadas (buscar, comparar, ficha y seguimiento) sin sesión redirigen a `/ingresar` con el mensaje "Necesitás iniciar sesión para entrar a esa pantalla."

Usada en: AUT-001, AUT-002.

### RN-023 Perfil de búsqueda

- Para guardarlo son **obligatorios** posición, liga y rango de edad. Si falta alguno, se marca el campo y no se guarda: "Para guardar el perfil falta elegir la posición y la liga."
- Presupuesto y mínimos tácticos son opcionales.
- Hay **un perfil por usuario.** Guardar uno nuevo reemplaza al anterior, con el aviso "Reemplaza al anterior: en el MVP hay un solo perfil".
- "Cargar perfil guardado" copia sus valores a los filtros.

Usada en: BUS-005.

### RN-024 Validación de filtros

| Filtro | Rango válido |
|---|---|
| Edad | 15 a 45, con `edad_min` ≤ `edad_max` |
| Pases y duelos | 0 a 100 |
| Recuperaciones | 0 a 15 |
| Minutos | 0 a 5000 |
| Presupuesto | mayor que 0 (con un límite técnico de 1.000.000.000, RN-003) |

Un valor fuera de rango devuelve 422. Un filtro vacío equivale a "sin filtro".

**Valores por defecto de la pantalla de búsqueda (supuesto):**

- todas las posiciones y todas las ligas;
- edad de 17 a 34;
- sin presupuesto;
- sin mínimos tácticos.

Usada en: BUS-001 a BUS-004.

### RN-025 Sincronización sin pérdida de datos

- Para cada liga se traen **todas** las páginas de `/players` antes de escribir.
- Se escribe en **una transacción por liga**:
  - **upsert** por `id_api_football` (jugador y equipo);
  - upsert por la clave única de `estadistica_temporada`.
- Si la API falla, da timeout o se queda sin cupo a mitad de camino:
  - se hace rollback de esa liga;
  - se registra `estado = error` con el mensaje en `sincronizacion`;
  - **no se tocan los datos existentes.**
- Un campo que la API devuelve `null` se guarda como `NULL`. **Nunca se convierte en 0.**
- Al terminar bien una liga, se recalcula la cobertura (RN-020).

Usada en: DAT-001, DAT-002.

### RN-026 Lista de seguimiento

- Cada usuario tiene su propia lista **(supuesto: por usuario, no por club)**.
- Agregar un jugador que ya está no hace nada (es idempotente).
- Se ordena del más reciente al más viejo.
- **"Comparar los primeros 3"** toma los primeros `min(3, n)` jugadores y requiere n ≥ 2.
- **Avisos:** "<Nombre> quedó guardado en la lista de seguimiento." / "<Nombre> salió de la lista de seguimiento."

Usada en: SEG-001.

### RN-027 Temporada que se usa en cada liga (decidida con el PO, 29/10)

**Contexto:** con la temporada "actual" de la API, en Primera Nacional, B Metropolitana, Primera C y Federal A la base quedaba casi vacía: la temporada 2026 tiene entre 0 y 4 jugadores cargados. La temporada 2025 de esas ligas sí tiene los planteles, con minutos y posición. El PO eligió mostrar el ascenso con datos de 2025 en lugar de dejarlo sin datos.

**Regla:** para cada liga se usa **la temporada más reciente que tenga al menos 100 jugadores con minutos jugados**:

```
para cada una de las 3 temporadas más nuevas de la liga (/leagues?id=X), de la más nueva a la más vieja:
    si /players de esa temporada trae al menos 100 jugadores distintos con minutos_jugados > 0: se usa esa
si ninguna cumple: se usa la más nueva y la liga queda sin_datos o basica según RN-020
```

- **El umbral de 100** evita que, al arrancar una temporada, la liga pase a una temporada con 2 o 3 jugadores cargados. Hasta que la nueva tenga el plantel, la liga sigue en la anterior.
- **Se mezclan temporadas:** la búsqueda en todas las ligas, el comparador y el promedio de la posición (RN-015) pueden juntar jugadores de temporadas distintas. La interfaz no muestra la temporada (decisión del equipo, Cilento, 26/11/2026); la API la sigue devolviendo.
- Con `--temporada` (corrida manual) no se aplica la regla: se usa la temporada pedida.

**Ejemplo (datos del 29/10):** Liga Profesional → 2026 (unos 1.200 jugadores con minutos). Primera Nacional → 2026 tiene 4 jugadores y ninguno con minutos, así que no alcanza → 2025. Primera C → ni 2026, ni 2025, ni 2024 llegan a 100 → queda en 2026, `sin_datos`.

Implementada en DAT-001 (`servicios/temporada.py` y `elegir_temporada` en `sincronizacion/api_football.py`).

### RN-028 Cobertura esperada de cada liga para la demo (decisión del equipo, Cilento, 26/11/2026; propuesta del 28/10)

Con los datos de hoy y aplicando RN-020 sobre la temporada de RN-027:

| Liga | Cobertura | Qué se puede filtrar |
|---|---|---|
| Liga Profesional | `completa` | Todo: posición, edad, presupuesto y los 4 mínimos tácticos |
| Primera Nacional, B Metropolitana y Federal A | `basica` | Posición, edad, presupuesto y minutos |
| Primera C | `basica` si la temporada 2025 llega a tener minutos; hoy, `sin_datos` | — |
| Primera D | `sin_datos` | Nada: "Todavía no tenemos datos de Primera D" |

**Pendiente de validar con el PO:** si conviene que la demo se apoye en la Liga Profesional para el comparador y las métricas tácticas, y muestre el ascenso como ejemplo de "Datos básicos".

---

### RN-029 Fuente de datos de cada liga (aprobada por el PO el 20/11/2026)

Ver ADR-0011 (aceptada).

| Liga | Fuente de las estadísticas |
|---|---|
| Liga Profesional, Primera B Metropolitana, Primera C y Primera D | API-Football |
| Primera Nacional y Torneo Federal A | Sportmonks |

El reparto sale de la prueba de 14 días (16/11/2026): Sportmonks trae rendimiento solo en Primera Nacional y Torneo Federal A (68 % a 84 % de los jugadores con cada dato). En Primera B Metropolitana, Primera C y Primera D no trae nada (0 %), y para B Metropolitana API-Football al menos trae minutos. La fuente de cada liga vive en `liga.fuente` y la carga la semilla de ligas.

- **Cada liga tiene una sola fuente** (`liga.fuente`). Nunca se mezclan en una misma liga.
- **La interfaz no indica la fuente** de las métricas: ni la ficha ni la búsqueda (decisión del PO, 20/11/2026).
- **Comparar entre fuentes distintas está permitido.** Si en el comparador hay jugadores de ligas con fuentes distintas, se muestra el aviso "El rating y los porcentajes vienen de fuentes distintas y no son directamente comparables" (decisión del PO, 20/11/2026; spec CMP-003). El aviso no nombra las fuentes.
- **Búsqueda que mezcla ligas:** sin aviso, pero **el orden por rating solo se puede usar con una liga elegida** (decisión del equipo, Cilento, 26/11/2026). Con una liga hay una sola fuente; con "Todas", el rating de Sportmonks y el de API-Football quedarían mezclados en una misma lista ordenada. El orden por % de pases sigue disponible sin liga.
  - **Ejemplo:** sin liga, ordenar por rating ponía primero a un jugador del Federal A con 8,59 (Sportmonks), arriba de todos los de la Liga Profesional (API-Football). Ahora, sin liga, `GET /jugadores?orden=rating` devuelve 422 (`orden`: "Elegí una liga para ordenar por rating."), y la pantalla no ofrece esa opción. Al quitar la liga mientras se ordena por rating, el orden vuelve a minutos.
- **Ejemplo:** un jugador de la Liga Profesional con rating 7,10 (API-Football) y uno de Primera Nacional con rating 7,40 (Sportmonks) pueden mostrarse juntos, pero con el aviso: el 7,40 no es "mejor" que el 7,10.

Usada en: DAT-003, CMP-003.

### RN-030 Cruce de jugadores de Sportmonks con la base (aprobada por el PO el 20/11/2026)

Para no duplicar a un jugador que pasa de una liga a otra:

1. Se normaliza el nombre (sin tildes, en minúsculas, sin puntuación).
2. Se busca en la base un jugador con el mismo nombre normalizado **y la misma fecha de nacimiento**.
3. Si hay **exactamente una** coincidencia: se agrega `id_sportmonks` a ese jugador.
4. Si hay **ninguna o más de una**: se crea un jugador nuevo y no se cruza (como en RN-002, paso 4).
5. Si falta la fecha de nacimiento en alguno de los dos, no se cruza.

**Ejemplo:** "Lucas Martínez", 15/03/1999, de Primera Nacional (Sportmonks) coincide con "L. Martinez" ya cargado de la Liga Profesional con la misma fecha → se agrega `id_sportmonks` al jugador existente. Si hubiera dos "Lucas Martínez" con esa fecha, se crea uno nuevo.

Usada en: DAT-003.

### RN-031 Datos de Sportmonks que se derivan o se traducen (decisión del equipo, Cilento, 26/11/2026; propuesta del 14/11/2026)

```
pases_precision_pct = el porcentaje que trae Sportmonks (tipo 1584), si es válido (0 a 100)
                      si no: pases_acertados / pases_totales * 100   (None si pases_totales es None o 0)
duelos_totales      = total-duels
duelos_ganados      = duels-won
intercepciones      = interceptions
rating              = promedio de la temporada (value.average)
```

- Un dato que no viene se guarda `NULL`, nunca 0 (RN-008 y RN-025).
- **Excepción, los contadores (decisión del equipo, Cilento, 26/11/2026):** Sportmonks no manda el tipo de un contador cuando vale 0. Si el jugador tiene minutos (`minutos_jugados > 0`) y no viene `goles` (tipo 52), `asistencias` (79) o `intercepciones` (100), se guarda **0**. Sin minutos, queda `NULL`. Los porcentajes, los duelos y el rating no son contadores: sin dato siguen en `NULL`.
  - **Ejemplo:** un arquero con 3.420 minutos sin el tipo 52 → `goles = 0`, y la ficha muestra 0 en lugar de "Dato no disponible". Un jugador con 0 minutos sin el tipo 52 → `goles = NULL`.
  - API-Football no necesita esta excepción: manda el 0 explícito (medido el 26/11/2026 en la Liga Profesional).
- Un dato que viola las invariantes del modelo (`duelos_ganados` > `duelos_totales`, o `pases_precision_pct` fuera de 0-100) queda `NULL`, igual que con API-Football.
- La posición se traduce a los 4 códigos de RN-019. **La tabla de posiciones de Sportmonks está pendiente**: se completa con los datos de la prueba, sin inventarla.

**Ejemplo:** 320 pases acertados de 400 → 80,00%. 61 duelos ganados de 100 → se guardan 61 y 100, y la UI calcula 61% (RN-018).

Usada en: DAT-003.


### RN-032 Cómo se arma la trayectoria que se muestra (decisión del equipo, Cilento, 26/11/2026; propuesta del 14/11/2026)

- Las temporadas de cada club se agrupan en **tramos de años consecutivos**. Si hay un hueco, son tramos separados. Los tramos de un club van del más reciente al más viejo.
- Los clubes se ordenan por su **último año, del más reciente al más viejo**. Los clubes sin años van al final, con "Sin año".
- **El club actual** (el equipo de la estadística elegida por RN-017) va primero con la marca "Actual", aunque no figure en la trayectoria que trajo la API.
- Si la trayectoria nunca se sincronizó, se muestra "Trayectoria no disponible" (RN-008). Si solo figura el club actual, se muestra ese club con la leyenda "No hay clubes anteriores registrados".

**Ejemplo** (datos reales de un jugador de Primera B Metropolitana): Deportivo Merlo [2024, 2025], Atlanta [2023], Alvarado [2020, 2021, 2022], San Martín de Tucumán [2018, 2019], Villa Dálmine [2013, 2014, 2015], Chacarita Juniors [2008, 2010, 2011, 2012, 2016, 2017]. Se muestra:

```
Deportivo Merlo (Actual)   2024–2025
Atlanta                    2023
Alvarado                   2020–2022
San Martín de Tucumán      2018–2019
Chacarita Juniors          2016–2017, 2010–2012, 2008
Villa Dálmine              2013–2015
```

(Chacarita queda antes que Villa Dálmine porque su último año, 2017, es más reciente que 2015.)

Usada en: JUG-003.

### RN-033 Qué no cuenta como club en la trayectoria (decisión del equipo, Cilento, 26/11/2026; propuesta del 14/11/2026)

- Las **selecciones nacionales** no se guardan ni se muestran. API-Football no las marca como tales, así que se reconocen por el nombre: un nombre igual a un país, con o sin categoría ("U17", "U20", "U23"), se descarta.
- Los equipos **juveniles y de reserva** de un club ("Club U20", "Club II", "Club Reserve") sí se muestran, tal como vienen.
- Si hay dudas sobre un nombre, se muestra: es preferible un dato de más que perder un club.

**Ejemplo:** "Argentina" y "Argentina U20" se descartan. "Argentino de Quilmes" se muestra, porque su nombre no es el de un país.

**A validar:** la lista de países es una aproximación. Con los datos reales hay que revisar qué nombres quedan mal clasificados.

Usada en: DAT-004, JUG-003.

### RN-034 Actualización de la trayectoria (decisión del equipo, Cilento, 26/11/2026; propuesta del 14/11/2026)

- Se hace **un pedido por jugador** (`/players/teams`).
- Un jugador se vuelve a pedir si **nunca se sincronizó o si pasaron más de 30 días** desde la última vez. Con `--forzar` se pide siempre.
- Cada corrida tiene un **tope de pedidos** (por defecto 5.000), para dejar margen del cupo diario de API-Football a la sincronización de estadísticas. Se empieza por los jugadores con más minutos.
- Si la API falla para un jugador, su trayectoria anterior no se toca y se reintenta en la próxima corrida (RN-025).

**Ejemplo:** 5.295 jugadores sin trayectoria y tope de 5.000: la primera corrida cubre 5.000 (los de más minutos) y la segunda los 295 restantes.

Usada en: DAT-004.

### RN-035 Búsqueda por nombre (decisión del equipo, Cilento, 26/11/2026; propuesta del 14/11/2026)

**Normalización.** El texto que escribe el usuario y el nombre del jugador se normalizan igual que en RN-002 (paso 1): minúsculas, sin tildes, sin signos y con espacios simples. Es la misma función (`normalizar_nombre`), no una copia.

**Con qué se compara.** Con las palabras de `nombre`, `nombre_pila` y `apellido` juntas. API-Football trae el nombre para mostrar abreviado ("S. Arias") y el nombre completo aparte ("Santiago" + "Arias Naranjo"): con `nombre` solo, "santiago arias" no encontraría a nadie. Si `nombre_pila` o `apellido` son nulos, se compara con lo que haya; nunca se excluye a un jugador por eso.

**Coincidencia.** El texto normalizado se separa en palabras. Un jugador coincide si **cada palabra del texto es el comienzo de alguna palabra de su nombre**. El orden de las palabras no importa.

**Largo del texto.**

- No hay mínimo: alcanza con una letra o un número. Las iniciales ("S.") tienen que servir como palabra.
- Si después de normalizar no queda nada (solo espacios o signos), equivale a "sin filtro" (RN-024).
- Máximo 60 caracteres, contados sobre el texto tal como se escribió. Más que eso devuelve 422: "Puede tener hasta 60 caracteres."

**Relación con las demás reglas.**

- Es un filtro más: se combina con AND con los otros.
- No cambia el orden de los resultados (RN-021). No se ordena por parecido con el texto.
- No se relaja en la sugerencia de RN-016, igual que la edad: la sugerencia se calcula manteniendo el nombre.
- No es un criterio de la coincidencia con el perfil (RN-012).

**Ejemplo.** En la base hay 4 jugadores:

| `nombre` | `nombre_pila` | `apellido` | Palabras normalizadas |
|---|---|---|---|
| S. Arias | Santiago | Arias Naranjo | s, arias, santiago, naranjo |
| Á. Correa | Ángel Martín | Correa Martínez | a, correa, angel, martin, martinez |
| Á. Di María | Ángel Fabián | Di María Hernández | a, di, maria, angel, fabian, hernandez |
| L. Magallán | Lisandro | Magallán | l, magallan, lisandro |

| Texto escrito | Normalizado | Coinciden | Cantidad |
|---|---|---|---|
| `ARIAS` | `arias` | S. Arias | 1 |
| `angel` | `angel` | Á. Correa y Á. Di María | 2 |
| `S. Ari` | `s ari` | S. Arias ("s" empieza "s" y "santiago"; "ari" empieza "arias") | 1 |
| `maría ángel` | `maria angel` | Á. Di María (el orden no importa) | 1 |
| `mar` | `mar` | Á. Correa ("martin") y Á. Di María ("maria"). L. Magallán no: "magallan" empieza con "mag" | 2 |
| `rias` | `rias` | Ninguno: "rias" no es el comienzo de ninguna palabra | 0 |
| `...` | (vacío) | Sin filtro: los 4 | 4 |

**Se había dejado para validar con el PO** (cerrado por el equipo el 26/11/2026: queda como está propuesto, desde el comienzo de la palabra, sin mínimo de caracteres y con un máximo de 60):

- si la coincidencia tiene que ser desde el comienzo de la palabra (lo propuesto) o en cualquier parte. Con "en cualquier parte", `rias` encontraría a S. Arias, pero la inicial de `S. Ari` coincidiría con cualquier nombre que tenga una "s";
- si hace falta un mínimo de 2 o 3 caracteres;
- el máximo de 60 caracteres.

Usada en: BUS-010.

### RN-036 Link para recuperar la contraseña (decisión del equipo, Cilento, 26/11/2026)

- Se pide con el correo. La respuesta es **siempre la misma**, tenga cuenta o no: "Si el correo tiene una cuenta, te mandamos un link para elegir una contraseña nueva." Así nadie puede averiguar quién está registrado, igual que en el ingreso (RN-022).
- El link **vence a los 60 minutos** y es de **un solo uso**: cuando se cambia la contraseña, todos los links pedidos antes dejan de servir.
- La contraseña nueva sigue RN-022 (mínimo 8 caracteres, con los mismos mensajes).
- Después de cambiarla, la sesión queda iniciada y se va a `/buscar`.

**Ejemplo:** Javier pide el link a las 10:00 y otro a las 10:05. A las 10:20 usa el segundo y cambia la contraseña: el primero ya no sirve (la contraseña cambió). Un link pedido a las 10:00 y abierto a las 11:01 está vencido.

Usada en: AUT-003.

### RN-037 Cómo se leen las barras de la comparación (propuesta, 27/11/2026)

- **Diferencia grande:** una fila tiene una diferencia grande si `(máximo − mínimo) / máximo >= 0,10`, entre los jugadores que tienen el dato. Con menos de 2 valores, o con máximo 0, no la tiene. El filtro "Solo diferencias grandes" oculta el resto.
- **Escala de la barra (actualizada el 27/11/2026, CMP-006):** el relleno de cada barra representa el número de la celda. Los porcentajes (`pases_precision_pct`, `duelos_ganados_pct`) se miden de 0 a 100 %; el rating, de 0 a 10; el resto (minutos, partidos, goles, asistencias y recuperaciones por partido) contra el mayor valor de la fila entre los jugadores visibles. Un valor 0 deja la barra vacía.
- **Grupos de métricas:** Ataque (goles, asistencias), Pase y defensa (% pases, % duelos, recuperaciones por partido) y Participación (minutos, partidos, rating).
- **Jugador oculto:** el resumen y Mejor/Peor se recalculan solo con los jugadores visibles, aplicando RN-006. Siempre quedan al menos 2.
- **Radar:** solo con las métricas en porcentaje y el rating; el rating (0 a 10) se multiplica por 10 para estar en la escala 0-100. Sin el dato, el eje queda sin punto (RN-008).
- **Pendiente:** el percentil contra la posición no entra hasta definir de qué universo se calcula.

**Ejemplo:** pases A 87, B 83, C 80: la diferencia es (87 − 80) / 87 = 8 %, no es grande. Duelos A 61, B 45: (61 − 45) / 61 = 26 %, sí. Con goles A 0 y B 0, el máximo es 0: no es grande.

Usada en: CMP-004 y CMP-006.

---

## Pendientes

- **PO:** validar RN-037 **(propuesta)**: lectura de las barras de la comparación (CMP-004).
- ~~**PO:** validar RN-035: búsqueda por nombre (BUS-010).~~ Cerrada como decisión del equipo, Cilento, 26/11/2026.
- ~~**PO y equipo:** validar ADR-0011, RN-029 y RN-030.~~ Resueltas el 20/11/2026: ADR-0011 aceptada, RN-029 aprobada con el reparto de fuentes de arriba y RN-030 aprobada tal como estaba.
- ~~**PO:** validar RN-031 a RN-034 **(propuestas)**. RN-028 (cobertura esperada de cada liga) se revisa con esto: con Sportmonks, Primera Nacional y Federal A pasan de `basica` a `completa` (medido el 16/11/2026 en Federal A).~~ Cerradas como decisión del equipo, Cilento, 26/11/2026. RN-031 suma los contadores en 0 de Sportmonks.

- ~~**Backend:** confirmar los campos de API-Football, sobre todo si `passes.accuracy` viene como % o como cantidad, y los IDs de las 6 ligas.~~ Resuelto el 28/10: `passes.accuracy` es un %, y los IDs son 128, 129, 131, 132, 133 y 134.
- ~~**PO:** validar RN-027.~~ Decidida el 29/10: el ascenso usa 2025 hasta que 2026 tenga 100 jugadores con minutos.
- ~~**PO:** validar RN-028, el mapeo de `Forward` en RN-019 y el cruce por palabras de RN-002 (paso 2b).~~ Cerradas como decisión del equipo, Cilento, 26/11/2026.
- ~~**PO, antes del Demo Day:** el valor de mercado casi no cubre el ascenso (RN-002, cobertura medida). Decidir si la demo del presupuesto se apoya en la Liga Profesional.~~ Desde el 26/11/2026 el presupuesto no tiene tope (RN-003), así que la demo se apoya en la Liga Profesional, que es la que tiene valores.
- ~~**Backend:** verificar la cobertura de transfermarkt-datasets en las ligas argentinas.~~ Medida el 28/10 en DAT-002 (ver RN-002).
- **Diseño:** ajustar el prototipo:
  - pasar a EUR;
  - sacar el Score, la distancia y los centros;
  - usar las 4 posiciones;
  - sumar el filtro de minutos y la Liga Profesional;
  - sacar Primera E;
  - poner el presupuesto apagado por defecto.
- **Trello:**
  - la historia "Comparar" dice "dos o más" en el título y tiene que decir "2 o 3";
  - la ficha tiene que listar todas las métricas de RN-001.
- **Entrevistas con usuarios** (siguen siendo útiles para R2): ¿piensan en el pase o en el sueldo? ¿en pesos o en dólares/euros? ¿qué significa "parecido"? ¿qué le muestran a la comisión?
