# Fixture de transfermarkt-datasets

`players_muestra.csv` tiene el mismo formato que `players.csv` de transfermarkt-datasets (CC0, corte del 6/7/2026). Se sacó del archivo real el 28/10/2026, con todas sus columnas.

| `player_id` | Jugador | Para qué sirve |
|---|---|---|
| 491705 | Facundo Colidio | Coincidencia exacta de RN-002 ("Facundo" + "Colidio" en API-Football) |
| 58088 | Fernando Muslera | Coincidencia por palabras (propuesta de RN-002): en API-Football es "Néstor Fernando" + "Muslera Micol" |
| 120443 | Santiago Arias | Coincidencia por palabras: en API-Football es "Santiago" + "Arias Naranjo" |
| 93176 | Marcos Rojo | Coincidencia por palabras: en API-Football es "Faustino Marcos Alberto" + "Rojo" |
| 441160 | Nicolás Castro | `market_value_in_eur` vacío: se cruza, pero queda sin valor |
| 667375 | Juan Antonini | Coincidencia ambigua, junto con la fila siguiente |
| 900000001 | Juan Antonini | **Armada a mano** (no existe en el dataset): copia de la anterior con otro `player_id` y otro valor, para el caso ambiguo |

Los tests nunca descargan el dataset completo.
