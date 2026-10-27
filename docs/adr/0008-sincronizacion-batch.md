# ADR-0008: Sincronización batch en lugar de consultas en vivo

**Estado:** Aceptada (2026-10-27)

## Contexto
API-Football tiene un cupo de 7.500 pedidos por día en el plan Pro. Los filtros combinados (AND sobre varias métricas) y los promedios por posición necesitan todos los jugadores de una liga, cosa que la API no resuelve en una sola consulta.

## Opciones consideradas
1. **Sincronización batch a MySQL y búsquedas contra MySQL.**
2. **Llamar a la API en cada búsqueda, con caché:** el cupo se gasta rápido y la demo depende de que la API responda.

## Decisión
Opción 1. Un CLI (`python -m app.sincronizacion.api_football`) trae `/players` paginado por liga y temporada y lo guarda en MySQL. Si la API falla, **no se sobrescriben datos existentes** (historia de Trello, criterio 2). Ver RN-025.

## Consecuencias
+ Las búsquedas son rápidas, el cupo se controla y la demo funciona aunque la API externa esté caída.
- Los datos tienen hasta 24 horas de atraso. Para estadísticas de temporada es aceptable.
