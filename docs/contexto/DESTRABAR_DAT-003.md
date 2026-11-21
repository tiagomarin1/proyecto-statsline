# DESTRABAR_DAT-003.md

Qué hay que cerrar para que DAT-003 (sincronizar el ascenso desde Sportmonks) cumpla `DEFINITION_OF_READY.md` y se pueda escribir el comando. Armado el 21/11/2026. La API-Football Pro vence el 28/11/2026, así que la decisión de fuentes tiene que estar antes.

## Parte 1. Pedido de validación al PO (Almeida)

Para cada punto alcanza con responder **sí**, **no** o **sí, pero** (con el cambio).

### 1. ADR-0011: una fuente de rendimiento por liga
- La Liga Profesional sigue con API-Football; las otras 5 ligas pasan a Sportmonks (plan Starter, EUR 29 por mes).
- Primera Nacional y Federal A pasarían de solo minutos y goles a asistencias, % de pases, intercepciones y rating.
- Primera C y Primera D siguen casi sin datos.
- **Se acepta solo si pasa la prueba de la Parte 2.** Lo que se pide hoy es el visto bueno para hacer la prueba y, si pasa, aceptarla sin otra ronda.

### 2. RN-029: ¿alcanza un aviso o hay que bloquear?
Cuando se comparan jugadores de fuentes distintas (por ejemplo, rating 7,10 de la Liga Profesional contra 7,40 de Primera Nacional):
- **a)** se muestran juntos con el aviso "El rating y los porcentajes vienen de fuentes distintas y no son directamente comparables"; o
- **b)** el comparador no deja mezclar fuentes.

Recomendación: **a**. Para un club chico, comparar un jugador del ascenso con uno de primera es justamente el caso de uso.

### 3. RN-030: cruce por nombre y fecha de nacimiento
Si hay exactamente una coincidencia con el mismo nombre normalizado y la misma fecha de nacimiento, se reutiliza el jugador. Si hay cero, más de una o falta la fecha, se crea un jugador nuevo. Riesgo aceptado: algunos jugadores pueden quedar duplicados. ¿Se acepta?

### 4. RN-031: % de pases y datos derivados
- `pases_precision_pct = pases acertados / pases totales × 100`, con `NULL` si no hay pases totales.
- Un dato que falta es `NULL`, nunca 0.
- ¿Se aprueba?

### 5. RN-028: Primera C y Primera D
Con Sportmonks siguen casi sin rendimiento. Opciones: mostrarlas con el cartel "Dato no disponible" o sacarlas del filtro de ligas hasta que tengan datos. Hace falta una decisión.

## Parte 2. Qué grabar en la prueba de 14 días

La clave real va en `SPORTMONKS_TOKEN` del `.env`, nunca en el repo. Cada resultado se anota en ADR-0011, en la tabla de la prueba.

### Criterios de la ADR (para aceptarla)
| Prueba | Para pasar | Resultado |
|---|---|---|
| Jugadores de Primera Nacional 2026 | al menos el 90% de los 1.673 de API-Football | |
| Cruce con nuestra base (RN-030), Primera Nacional y Federal A | al menos 90% | |
| 30 jugadores con más minutos por liga: rating, pases, duelos e intercepciones | llenos en al menos el 80% | |
| Pedidos de una sincronización completa | dentro de 2.000 por hora y por entidad | |

### Datos a confirmar que hoy son supuestos
1. **Valor del parámetro `{participant}`** en `/statistics/seasons/{participant}/{id}`.
2. **IDs de posición.** Hoy `mapeo_sportmonks.py` supone 24 arquero, 25 defensor, 26 mediocampista y 27 delantero. Se verifican contra `/core/types`.
3. **Tipos de estadística** usados en el mapeo: 119 minutos, 321 partidos, 52 goles, 79 asistencias, 80 pases, 116 pases acertados, 105 duelos totales, 106 duelos ganados, 100 intercepciones y 118 rating.
4. **Formato de nacionalidad y posición** (llegan como IDs: include o tabla de tipos).
5. **Estabilidad de los IDs** entre dos corridas separadas por unos días.
6. **Temporadas disponibles** por liga (sin add-on, las 3 más recientes) y cuál elegiría RN-027.

### Respuestas a grabar como fixtures
Se guardan en `backend/tests/fixtures/sportmonks/`, **sin el token y sin datos de contacto**, reemplazando los fixtures de la documentación:
- equipos de una temporada (`/teams/seasons/{id}`), una página;
- estadísticas de temporada de un equipo, con jugador y equipo incluidos;
- un jugador con todas las métricas llenas;
- un jugador con métricas faltantes;
- una respuesta 429 con `retry_after`;
- el listado de tipos de posición.

## Parte 3. Consulta por escrito a Sportmonks (uso comercial)
Los términos dicen "uso personal y no comercial" y a la vez permiten apps con ingresos. Pregunta sugerida:

> Vamos a mostrar estadísticas de jugadores del ascenso argentino dentro de una plataforma web de scouting para clubes, por suscripción. Los datos se descargan por lotes y se guardan en nuestra base. ¿El plan Starter cubre este uso comercial y el almacenamiento de los datos? Si no, ¿qué plan o acuerdo corresponde?

Bloquea la salida a producción, no el desarrollo.

## Cuando todo esté cerrado
1. ADR-0011 pasa a "Aceptada" (con los resultados de la prueba).
2. RN-029 a RN-031 pasan de "(propuesta)" a validadas; se completa la tabla de posiciones de RN-031.
3. La spec DAT-003 pasa a `spec-aprobada` y se actualizan `mapeo_sportmonks.py` y los fixtures con lo grabado.
4. Recién ahí se escribe el comando: primero el test en rojo, después el código.
