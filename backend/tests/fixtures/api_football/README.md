# Fixtures de API-Football

Respuestas reales, grabadas una sola vez el 28/10/2026 con el plan Pro. Los tests nunca llaman a la API real (TESTING_STRATEGY.md). No incluyen la API key: el header de la clave no viaja en la respuesta.

| Archivo | Pedido | Para qué sirve |
|---|---|---|
| `leagues_argentina.json` | `/leagues?country=Argentina` | IDs de liga, temporadas y flags de cobertura |
| `league_133_temporada_vieja.json` | `/leagues?id=133&current=true` | Una liga cuya temporada "actual" es 2023 (Primera D) |
| `players_liga_completa_128_2026_p1.json` | `/players?league=128&season=2026&page=1` | Liga `completa`: minutos, pases %, duelos, intercepciones y rating. Página 1 de 60. Incluye un jugador repetido con dos equipos (RN-017) |
| `players_liga_basica_129_2025_p1.json` | `/players?league=129&season=2025&page=1` | Liga `basica`: solo minutos (y no en todos) y posición, con las métricas en `null` |
| `players_liga_sin_datos_132_2026_p1.json` | `/players?league=132&season=2026&page=1` | Liga sin jugadores (`results = 0`) |
| `players_error_sin_temporada.json` | `/players?league=128` | Respuesta con `errors` no vacío y `results = 0` |
