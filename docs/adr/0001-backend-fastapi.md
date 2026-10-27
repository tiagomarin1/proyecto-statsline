# ADR-0001: Backend en FastAPI

**Estado:** Aceptada (2026-10-27)

## Contexto
Hace falta una API que sirva búsquedas y comparaciones sobre MySQL, que se integre con API-Football y que el equipo pueda mantener trabajando con IA (SDD + TDD). La tarjeta de Trello "Definir repo, stack y entorno" pedía elegir el lenguaje y el framework.

## Opciones consideradas
1. **FastAPI (Python):** validación con Pydantic, documentación OpenAPI automática y async disponible si hace falta.
2. **Django REST Framework:** trae más cosas resueltas (admin, auth), pero es más pesado para un MVP de 2 semanas.
3. **Express o Nest (Node):** mismo lenguaje que el frontend, pero con un tipado más débil (Express) o una curva de aprendizaje más alta (Nest).

## Decisión
FastAPI.

## Consecuencias
+ La documentación de la API (`/docs`) queda siempre al día con el código.
+ La validación de entrada es declarativa y la lógica se testea fácil con pytest.
- El equipo trabaja con dos lenguajes (Python y TypeScript).
