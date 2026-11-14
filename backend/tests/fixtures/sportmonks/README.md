# Fixtures de Sportmonks

**Todavía no son grabaciones reales.** `estadisticas_por_participante_muestra.json` está armado a
mano con la forma que documenta Sportmonks (docs.sportmonks.com/v3, estadísticas de temporada por
participante, includes `player` y `team`, y los tipos de estadística de jugador), con jugadores y
equipos inventados.

Cuando haya un token con acceso a las ligas argentinas (prueba de 14 días, ver `DAT-003.md`), este
archivo se reemplaza por una respuesta real grabada, y los tests se ajustan a lo que devuelva.

Tipos usados (IDs de `player-statistics`): 119 minutos, 321 partidos, 52 goles (`value.total`),
79 asistencias, 80 pases, 116 pases acertados, 105 duelos totales, 106 duelos ganados,
100 intercepciones, 118 rating (`value.average`).
