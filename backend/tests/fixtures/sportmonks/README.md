# Sportmonks en los tests

Ya no hay fixtures de Sportmonks en JSON. Las respuestas falsas se arman en
`backend/tests/sportmonks_falsa.py` con la **forma real** de la API, que se confirmó el 16/11/2026
con la prueba de 14 días (`python -m app.sincronizacion.explorar_sportmonks`), pero con jugadores y
equipos inventados: Sportmonks no permite redistribuir su feed, así que no se copian respuestas
reales al repositorio.

Las respuestas reales grabadas por el script de exploración quedan en
`backend/grabaciones_sportmonks*/`, fuera de git.

Tipos de estadística usados (IDs de `player-statistics`): 119 minutos, 321 partidos, 52 goles
(`value.total`), 79 asistencias, 80 pases, 116 pases acertados, 1584 porcentaje de pases,
105 duelos totales, 106 duelos ganados, 100 intercepciones, 118 rating (`value.average`).
