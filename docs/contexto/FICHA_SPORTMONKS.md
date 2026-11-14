# FICHA_SPORTMONKS.md

Ficha de Sportmonks Football API para decidir en grupo si reemplaza o complementa a API-Football. Datos del 14/11/2026. El detalle de la comparación con las demás fuentes está en `INVESTIGACION_FUENTES_DATOS.md`.

Etiquetas: **[medido]** lo vimos nosotros en la herramienta de Sportmonks con una cuenta gratuita; **[documentado]** figura en su documentación o página oficial; **[sin confirmar]** no lo pudimos ver. **Todavía no se hizo ninguna llamada real a la API.**

## 1. Precio

| Plan | Mensual | Ligas a elección | Límite de pedidos |
|---|---|---|---|
| Starter | EUR 29 | 5 | 2.000 por entidad y por hora |
| Growth | EUR 99 | 30 | 2.500 |
| Pro | EUR 249 | 120 | 3.000 |
| Enterprise | A medida | Todas (2.300+) | 5.000 |

- **Todos los planes incluyen las mismas funciones.** Cambian la cantidad de ligas y el límite. [documentado]
- Pago anual con descuento (hasta 20% según la página). Se paga con tarjeta o PayPal.
- Add-ons: ligas extra desde EUR 4 por mes; historial de más de 3 temporadas, EUR 29 por única vez; xG desde EUR 29 por mes; pedidos extra desde EUR 29 por mes. No los necesitamos.
- **Prueba gratuita de 14 días**, una sola vez por cuenta, **con tarjeta**: si no se cancela a tiempo, cobra. [documentado]
- Los pagos ya procesados no se reembolsan. Cancelar evita la renovación y el acceso sigue hasta fin del período pagado.
- Los precios pueden subir con 30 días de aviso por email.

**Para StatsLine:** el Starter (EUR 29) alcanza si se eligen 5 ligas. Hoy API-Football cuesta USD 19.

## 2. Cobertura de las ligas argentinas [medido, Coverage Finder, 14/11/2026]

| Liga | Nota | Campos de jugador | Minutos | Goles | Asist. | Pases | Interc. y tackles | Rating | Duelos |
|---|---|---|---|---|---|---|---|---|---|
| Liga Profesional de Fútbol | Excellent | 36 de 38 | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Primera B Nacional | Good | 36 de 38 | Sí | Sí | Sí | Sí (se calcula el %) | Sí | Sí | A confirmar |
| Torneo Federal A | Good | 34 de 38 | Sí | Sí | Sí | Sí (se calcula el %) | Sí | Sí | A confirmar |
| Primera B Metropolitana | Basic | 11 de 38 | Sí | Sí | No | No | No | No | No |
| Primera C | Basic | 2 de 38 | No | Sí | No | No | No | No | No |
| Primera D Metropolitana | Basic | 2 de 38 | No | Sí | No | No | No | No | No |

- Perfil del jugador en las 6 ligas: fecha de nacimiento, posición, altura, peso, nacionalidad, ciudad y país.
- "Cobertura" significa que el campo se publica para esa liga, **no que cada jugador lo tenga lleno.**
- Además hay 19 ligas y 8 copas argentinas en el catálogo (Federal B regionales, Reserva, copas).

## 3. Qué datos trae [documentado]

- **Estadísticas de temporada por jugador:** minutos, partidos, goles, asistencias, pases totales y acertados (y % de pases), duelos totales y ganados, intercepciones, tackles, rating, tarjetas, remates, regates, centros.
- **Plantel por equipo y temporada** (`start` y `end` figuran como fechas de contrato; a probar si vienen llenos), pie hábil (`metadata`, no siempre poblado), altura y peso.
- **Transferencias** (`/transfers/players/{id}` y `/transfers/teams/{id}`): fecha, equipo de origen y destino, tipo (libre, préstamo, traspaso) y monto. El jugador también tiene el include `teams.team` con fechas de inicio y fin.
- Lesiones y suspensiones.

## 4. Qué no trae

- **Valor de mercado:** no figura en ningún módulo ni entidad. [medido y documentado]
- **Trayectoria en el ascenso argentino:** hay endpoints de transferencias, pero el Coverage Finder no tiene un módulo de transferencias. No sabemos si hay datos de ligas menores. [sin confirmar]
- **Primera C y D:** casi sin datos de rendimiento (solo goles y tarjetas rojas).

## 5. Cómo se trae la información (cambia respecto de hoy)

- **No hay una llamada que devuelva todos los jugadores de una liga y temporada** (API-Football sí la tiene). La ruta documentada: equipos de la temporada, luego estadísticas de temporada por participante (hasta 50 por página) o plantel por equipo. Estimación de pedidos por sincronización completa: 150 a 300 (sin probar). Entra holgado en el límite.
- Nacionalidad y posición vienen como IDs que hay que traducir.
- Sin el add-on de historial, solo se consultan las 3 temporadas más recientes de cada liga.
- Los IDs de jugador y equipo no están documentados como estables. Habría que agregar `id_sportmonks` y cruzar los 5.295 jugadores actuales por nombre y fecha de nacimiento.

## 6. Términos de uso [documentado]

- No se puede revender los datos. La cuenta es personal (no se comparte con otros desarrolladores). Los datos se licencian por dominio.
- Hacer una app que genere ingresos con los datos está permitido, pero otra cláusula dice que los materiales del sitio son "para uso personal y no comercial": **hay que consultarles por escrito antes de salir a producción.**
- No encontramos cláusulas de caché ni de atribución. Ley aplicable: Países Bajos.

## 7. Comparación con API-Football

| | API-Football (hoy) | Sportmonks |
|---|---|---|
| Costo | USD 19 por mes (Pro) | EUR 29 por mes (Starter, 5 ligas) |
| Liga Profesional | Completa | Completa |
| Primera Nacional y Federal A | Minutos y posición | **Casi completas** |
| B Metropolitana, C y D | Minutos y posición, o nada | Algo más (goles y tarjetas) |
| Trayectoria | **Sí, probada** | Sin confirmar |
| Un solo pedido para traer una liga | Sí | No |
| Rating y % comparables entre ligas | Solo si todas las ligas salen de la misma fuente | Ídem |

**Punto clave:** el rating y los porcentajes de cada proveedor no son comparables entre sí. Por eso conviene una sola fuente para todas las ligas.

## 8. Cómo lo probamos (14 días)

| Prueba | Para pasar |
|---|---|
| Traer todos los jugadores de Primera B Nacional 2026 | Al menos 90% de los 1.673 de API-Football |
| Cruzar por nombre y nacimiento con nuestra base | Al menos 90% en Liga Profesional, Primera Nacional y Federal A |
| 30 jugadores con más minutos por liga | Rating, pases, duelos e intercepciones llenos en al menos 80% |
| **Trayectoria** de 20 jugadores del ascenso | Al menos 80% de los clubes que ya tenemos |
| Fechas de contrato en el plantel | Medir cuántos vienen llenos |
| Pedidos de una sincronización completa | Dentro del límite por hora |

**Regla de decisión:**
- Pasa todo: **reemplazamos API-Football** y usamos solo Sportmonks.
- Pasa el rendimiento pero falla la trayectoria: **usamos las dos** (Sportmonks para rendimiento y API-Football solo para trayectoria).
- Falla el rendimiento: seguimos con API-Football.

## 9. Fechas y decisiones del grupo

- **16/11/2026:** MVP v2. No se toca la fuente de datos antes.
- **28/11/2026:** vence API-Football Pro. Antes de esa fecha hay que decidir si se renueva un mes más.
- Alguien tiene que cargar la tarjeta para la prueba, y cancelarla a tiempo si no se sigue.
- Si se adopta Sportmonks: una ADR nueva (amplía ADR-0004 y ADR-0008), agregar `id_sportmonks` al modelo canónico (requiere aprobación), reescribir la sincronización (DAT-001) y definir con el PO qué se muestra de Primera C, Primera D y Primera B Metropolitana (RN-028).
