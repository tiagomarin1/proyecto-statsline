# ADR-0007: Todo el código en español

**Estado:** Aceptada (2026-10-27)

## Contexto
El dominio, las historias, las reglas y la UI están en español. Mezclar idiomas (por ejemplo `Player` y `jugador`) rompe la consistencia cuando se trabaja con IA.

## Decisión
Están en español las tablas, columnas, clases, funciones, variables, endpoints, campos JSON, tests y commits. Quedan en inglés las palabras reservadas, los nombres de librerías y lo que impone un framework (`router`, `Depends`, `useState`). En los identificadores no se usan tildes ni ñ (`contrasena`, `tamano`). Los nombres canónicos están en `GLOSARIO.md`.

## Consecuencias
+ El código, las docs y las conversaciones con la IA usan el mismo lenguaje.
- Quedan identificadores híbridos inevitables (`def obtener_jugador(session: Session)`).
